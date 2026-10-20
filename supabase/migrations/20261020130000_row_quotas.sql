-- Per-owner row quotas and diary date bounds.
--
-- Signed-in users keep INSERT on their own tables (the Server Actions write
-- through the user's RLS-bound session), so nothing stopped one account from
-- posting large JSON arrays straight to the Data API and growing the shared
-- database without bound. These BEFORE INSERT triggers cap how many rows one
-- owner can hold. The caps are generous: far above what a person logs by hand.
--
-- The count runs as the caller (SECURITY INVOKER), so RLS limits it to the
-- caller's own rows, which is exactly the scope of the quota. A row trigger
-- also sees the rows inserted earlier by the same statement, so a single bulk
-- insert past the cap fails as a whole. Concurrent transactions do not see
-- each other's uncommitted rows and can overshoot the cap slightly; that is
-- acceptable for a storage quota.
--
-- Rows whose scope column is null are not counted or limited: foods and
-- activities with owner_id null are the shared catalogs, written only by the
-- service role (catalog import, seed).
--
-- Error contract (read by the Server Actions): SQLSTATE 23514
-- (check_violation) with the message prefix "row_quota:<table>:".

create or replace function private.enforce_row_quota()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  -- Trigger arguments: the cap, then the column(s) that define one owner's set.
  max_rows int := tg_argv[0]::int;
  scope_columns text[] := tg_argv[1:];
  new_row jsonb := pg_catalog.to_jsonb(new);
  scope_column text;
  predicate text := 'true';
  existing int;
begin
  foreach scope_column in array scope_columns loop
    if new_row ->> scope_column is null then
      return new;
    end if;
    predicate := pg_catalog.format('%s and t.%I = ($1).%I', predicate, scope_column, scope_column);
  end loop;

  -- Bounded count: stop reading at the cap (each scope has an index).
  execute pg_catalog.format(
    'select count(*) from (select 1 from %I.%I t where %s limit %s) capped',
    tg_table_schema, tg_table_name, predicate, max_rows
  ) into existing using new;

  if existing >= max_rows then
    raise exception using
      errcode = 'check_violation',
      message = pg_catalog.format(
        'row_quota:%s: at most %s rows per %s',
        tg_table_name, max_rows, pg_catalog.array_to_string(scope_columns, ', ')
      ),
      table = tg_table_name;
  end if;
  return new;
end;
$$;

comment on function private.enforce_row_quota() is
  'BEFORE INSERT row trigger: rejects a row once its owner already holds tg_argv[0] rows (scope: the remaining arguments).';

revoke all on function private.enforce_row_quota() from public, anon, authenticated;

create trigger foods_enforce_row_quota
  before insert on public.foods
  for each row execute function private.enforce_row_quota('5000', 'owner_id');

create trigger food_portions_enforce_row_quota
  before insert on public.food_portions
  for each row execute function private.enforce_row_quota('50', 'food_id');

create trigger food_favorites_enforce_row_quota
  before insert on public.food_favorites
  for each row execute function private.enforce_row_quota('2000', 'user_id');

create trigger recipes_enforce_row_quota
  before insert on public.recipes
  for each row execute function private.enforce_row_quota('500', 'user_id');

create trigger recipe_items_enforce_row_quota
  before insert on public.recipe_items
  for each row execute function private.enforce_row_quota('100', 'recipe_id');

create trigger food_entries_enforce_row_quota
  before insert on public.food_entries
  for each row execute function private.enforce_row_quota('200', 'user_id', 'entry_date');

create trigger activities_enforce_row_quota
  before insert on public.activities
  for each row execute function private.enforce_row_quota('500', 'owner_id');

create trigger activity_entries_enforce_row_quota
  before insert on public.activity_entries
  for each row execute function private.enforce_row_quota('100', 'user_id', 'entry_date');

-- Diary dates: the same range the app accepts (src/features/diary/lib/diary-date.ts).
-- Without it, weight_entries' one-row-per-day rule did not bound anything:
-- every date up to year 5874897 was a new day.

alter table public.food_entries
  add constraint food_entries_entry_date_range check (entry_date between '2000-01-01' and '2100-12-31');

alter table public.activity_entries
  add constraint activity_entries_entry_date_range check (entry_date between '2000-01-01' and '2100-12-31');

alter table public.weight_entries
  add constraint weight_entries_entry_date_range check (entry_date between '2000-01-01' and '2100-12-31');
