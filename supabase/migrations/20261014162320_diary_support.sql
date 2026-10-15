-- Diary support.
--
-- 1. food_entries.quantity + portion_label: how the entry was logged
--    ("2 x 1 slice"), so the diary can show it and the edit form can restore
--    it. Both null means the entry was logged in plain grams.
-- 2. public.recent_foods(): the caller's most recently logged distinct foods,
--    for the "Recent" shortcut in the add-food flow.
-- 3. public.copy_food_entries(): copies one day's entries (or one meal) to
--    another day in a single INSERT ... SELECT. Snapshots are copied as-is.
--
-- Both functions are SECURITY INVOKER: RLS on food_entries, foods and
-- food_favorites still decides what the caller can read and write.

alter table public.food_entries
  add column quantity numeric(7, 2) check (quantity > 0 and quantity <= 1000),
  add column portion_label text check (char_length(portion_label) between 1 and 100),
  add constraint food_entries_portion_complete check ((quantity is null) = (portion_label is null));

comment on column public.food_entries.quantity is 'Number of portions logged; null when logged in grams.';
comment on column public.food_entries.portion_label is 'Portion label at log time (e.g. "1 slice"); null when logged in grams.';

-- "Recent foods" reads the caller's latest entries by creation time.
create index food_entries_user_id_created_at_idx on public.food_entries (user_id, created_at desc);


create or replace function public.recent_foods(result_limit integer default 10)
returns table (
  id bigint,
  name text,
  brand text,
  source text,
  food_group text,
  barcode text,
  kcal_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  is_own boolean,
  is_favorite boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with latest as (
    -- Bounded window over the (user_id, created_at desc) index.
    select e.food_id, e.created_at
    from public.food_entries e
    where e.user_id = (select auth.uid())
      and e.food_id is not null
    order by e.created_at desc
    limit 200
  ),
  recent as (
    select food_id, max(created_at) as last_logged
    from latest
    group by food_id
  )
  select
    f.id,
    f.name,
    f.brand,
    f.source,
    f.food_group,
    f.barcode,
    f.kcal_per_100g,
    f.protein_per_100g,
    f.carbs_per_100g,
    f.fat_per_100g,
    coalesce(f.owner_id = (select auth.uid()), false) as is_own,
    fav.food_id is not null as is_favorite
  from recent r
  join public.foods f on f.id = r.food_id
  left join public.food_favorites fav
    on fav.food_id = f.id
   and fav.user_id = (select auth.uid())
  order by r.last_logged desc, f.id
  limit least(greatest(coalesce(result_limit, 10), 1), 30);
$$;

comment on function public.recent_foods(integer) is
  'The caller''s most recently logged distinct foods (RLS applies: SECURITY INVOKER).';

revoke all on function public.recent_foods(integer) from public, anon;
grant execute on function public.recent_foods(integer) to authenticated;


create or replace function public.copy_food_entries(
  source_date date,
  target_date date,
  only_meal text default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  copied integer;
begin
  if source_date is null or target_date is null or source_date = target_date then
    raise exception 'source_date and target_date must be different dates' using errcode = '22023';
  end if;
  if only_meal is not null and only_meal not in ('breakfast', 'lunch', 'snack', 'dinner', 'extra') then
    raise exception 'unknown meal: %', only_meal using errcode = '22023';
  end if;

  insert into public.food_entries (
    user_id, entry_date, meal, food_id, recipe_id, label, grams, quantity, portion_label, kcal, protein, carbs, fat
  )
  select
    e.user_id, target_date, e.meal, e.food_id, e.recipe_id, e.label, e.grams, e.quantity, e.portion_label,
    e.kcal, e.protein, e.carbs, e.fat
  from public.food_entries e
  where e.user_id = (select auth.uid())
    and e.entry_date = source_date
    and (only_meal is null or e.meal = only_meal)
  order by e.created_at, e.id;

  get diagnostics copied = row_count;
  return copied;
end;
$$;

comment on function public.copy_food_entries(date, date, text) is
  'Copies the caller''s entries of source_date (optionally one meal) to target_date. Returns the number of rows copied.';

revoke all on function public.copy_food_entries(date, date, text) from public, anon;
grant execute on function public.copy_food_entries(date, date, text) to authenticated;
