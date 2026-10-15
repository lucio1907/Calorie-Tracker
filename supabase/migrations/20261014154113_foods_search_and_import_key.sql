-- Food catalog search and idempotent catalog imports.
--
-- 1. external_code + food_group: shared catalog rows keep the code and group
--    of their source (e.g. ARGENFOODS food number), so re-running an import
--    upserts on (source, external_code) instead of duplicating rows.
-- 2. search_name: lower-cased, accent-free copy of name maintained by a
--    trigger, so "limon" finds "Limón". The trigram index moves to it.
-- 3. public.search_foods(): SECURITY INVOKER RPC over own + shared foods.
--    RLS on foods and food_favorites still decides which rows are visible.

create extension if not exists unaccent with schema extensions;

alter table public.foods
  add column external_code text check (char_length(external_code) between 1 and 50),
  add column food_group text check (char_length(food_group) between 1 and 100),
  add column search_name text;

comment on column public.foods.external_code is 'Identifier in the source catalog (e.g. ARGENFOODS food number). Shared rows only.';
comment on column public.foods.food_group is 'Food group as named by the source catalog.';
comment on column public.foods.search_name is 'lower(unaccent(name)); maintained by trigger, used for search.';

-- Codes belong to the shared catalog: user rows (custom, cached OFF products)
-- never carry one, so they can never collide with an import.
alter table public.foods
  add constraint foods_external_code_shared_only check (external_code is null or owner_id is null);

-- Upsert target for imports. NULLs stay distinct, so rows without a code are unaffected.
alter table public.foods
  add constraint foods_source_external_code_key unique (source, external_code);

-- Two-argument unaccent: the one-argument form resolves its dictionary through
-- search_path, which is empty here.
create or replace function private.set_food_search_name()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.search_name := lower(extensions.unaccent('extensions.unaccent'::regdictionary, new.name));
  return new;
end;
$$;

revoke all on function private.set_food_search_name() from public, anon, authenticated;

update public.foods
  set search_name = lower(extensions.unaccent('extensions.unaccent'::regdictionary, name));

-- Not null with an empty default so inserts may omit it; the trigger fills it.
alter table public.foods
  alter column search_name set default '',
  alter column search_name set not null;

create trigger foods_set_search_name
  before insert or update of name on public.foods
  for each row execute function private.set_food_search_name();

drop index public.foods_name_trgm_idx;
create index foods_search_name_trgm_idx on public.foods using gin (search_name extensions.gin_trgm_ops);


-- Search own + shared foods by name: substring match, or fuzzy word match
-- when no food contains the text.
-- Empty query lists favorites, then own foods, then the shared catalog.
create or replace function public.search_foods(
  search_query text default '',
  favorites_only boolean default false,
  result_limit integer default 30
)
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
  with params as (
    select
      q,
      -- LIKE pattern with the user's wildcards escaped.
      replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') as q_like,
      least(greatest(coalesce(result_limit, 30), 1), 50) as lim
    from (
      select lower(extensions.unaccent(
        'extensions.unaccent'::regdictionary,
        left(btrim(coalesce(search_query, '')), 100)
      )) as q
    ) normalized
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
  from public.foods f
  cross join params p
  left join public.food_favorites fav
    on fav.food_id = f.id
   and fav.user_id = (select auth.uid())
  where (not favorites_only or fav.food_id is not null)
    and (
      p.q = ''
      or f.search_name like '%' || p.q_like || '%'
      -- Typo tolerance (strict word similarity >= 0.5, "aroz" -> "arroz")
      -- only when nothing contains the text, so an exact hit such as
      -- "granola" is not buried under "grano ..." rows.
      or (
        p.q operator(extensions.<<%) f.search_name
        and not exists (
          select 1 from public.foods hit
          where hit.search_name like '%' || p.q_like || '%'
        )
      )
    )
  order by
    (p.q <> '' and f.search_name like p.q_like || '%') desc,
    case when p.q = '' then 0 else extensions.strict_word_similarity(p.q, f.search_name) end desc,
    (fav.food_id is not null) desc,
    (f.owner_id is not null) desc,
    f.name,
    f.id
  limit (select lim from params);
$$;

comment on function public.search_foods(text, boolean, integer) is
  'Name search over foods visible to the caller (RLS applies: SECURITY INVOKER).';

revoke all on function public.search_foods(text, boolean, integer) from public, anon;
grant execute on function public.search_foods(text, boolean, integer) to authenticated;
