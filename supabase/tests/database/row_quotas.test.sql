-- Per-owner row quotas and diary date bounds (migration row_quotas).
-- BEFORE INSERT triggers cap how many rows one owner can hold, so a signed-in
-- user posting large JSON arrays straight to the Data API cannot grow the
-- database without bound. Rows of the shared catalogs (owner_id null, written
-- by the service role) are never counted or limited.
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(17);

select has_trigger('public', 'foods', 'foods_enforce_row_quota', 'foods has the row-quota trigger');
select has_trigger('public', 'food_portions', 'food_portions_enforce_row_quota', 'food_portions has the row-quota trigger');
select has_trigger('public', 'food_favorites', 'food_favorites_enforce_row_quota', 'food_favorites has the row-quota trigger');
select has_trigger('public', 'recipes', 'recipes_enforce_row_quota', 'recipes has the row-quota trigger');
select has_trigger('public', 'recipe_items', 'recipe_items_enforce_row_quota', 'recipe_items has the row-quota trigger');
select has_trigger('public', 'food_entries', 'food_entries_enforce_row_quota', 'food_entries has the row-quota trigger');
select has_trigger('public', 'activities', 'activities_enforce_row_quota', 'activities has the row-quota trigger');
select has_trigger('public', 'activity_entries', 'activity_entries_enforce_row_quota', 'activity_entries has the row-quota trigger');

-- Fixtures (as postgres, bypassing RLS) -------------------------------------

insert into auth.users (id, email, aud, role)
values ('00000000-0000-4000-a000-0000000000e1', 'quota-a@local.test', 'authenticated', 'authenticated');

-- User A: food_entries are capped at 200 per day ----------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000e1","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.food_entries (user_id, entry_date, meal, label, grams, kcal)
    select '00000000-0000-4000-a000-0000000000e1', '2026-10-14', 'lunch', 'entry ' || g, 100, 100
    from generate_series(1, 200) g$$,
  'a day can hold 200 entries'
);

select throws_ok(
  $$insert into public.food_entries (user_id, entry_date, meal, label, grams, kcal)
    values ('00000000-0000-4000-a000-0000000000e1', '2026-10-14', 'dinner', 'one too many', 100, 100)$$,
  '23514', 'row_quota:food_entries: at most 200 rows per user_id, entry_date',
  'the 201st entry of the day is rejected'
);

select lives_ok(
  $$insert into public.food_entries (user_id, entry_date, meal, label, grams, kcal)
    values ('00000000-0000-4000-a000-0000000000e1', '2026-10-15', 'dinner', 'next day', 100, 100)$$,
  'the cap is per day: another day still accepts entries'
);

select throws_ok(
  $$insert into public.food_entries (user_id, entry_date, meal, label, grams, kcal)
    select '00000000-0000-4000-a000-0000000000e1', '2026-10-16', 'lunch', 'bulk ' || g, 100, 100
    from generate_series(1, 201) g$$,
  '23514', 'row_quota:food_entries: at most 200 rows per user_id, entry_date',
  'one bulk insert of 201 rows (a single Data API POST) is rejected as a whole'
);

select results_eq(
  $$select entry_date, count(*)::int from public.food_entries group by entry_date order by entry_date$$,
  $$values ('2026-10-14'::date, 200), ('2026-10-15'::date, 1)$$,
  'rejected inserts left no rows behind'
);

-- Diary dates outside 2000-01-01..2100-12-31 are rejected --------------------

select throws_ok(
  $$insert into public.food_entries (user_id, entry_date, meal, label, grams, kcal)
    values ('00000000-0000-4000-a000-0000000000e1', '1999-12-31', 'lunch', 'too early', 100, 100)$$,
  '23514', 'new row for relation "food_entries" violates check constraint "food_entries_entry_date_range"',
  'a food entry before 2000 is rejected'
);

select throws_ok(
  $$insert into public.activity_entries (user_id, entry_date, label, minutes, kcal)
    values ('00000000-0000-4000-a000-0000000000e1', '2101-01-01', 'too late', 30, 100)$$,
  '23514', 'new row for relation "activity_entries" violates check constraint "activity_entries_entry_date_range"',
  'an activity entry after 2100 is rejected'
);

select throws_ok(
  $$insert into public.weight_entries (user_id, entry_date, kg)
    values ('00000000-0000-4000-a000-0000000000e1', '9999-01-01', 80)$$,
  '23514', 'new row for relation "weight_entries" violates check constraint "weight_entries_entry_date_range"',
  'a weight entry after 2100 is rejected'
);

-- Shared catalog: owner_id null rows are not limited --------------------------

reset role;
set local role service_role;

select lives_ok(
  $$insert into public.foods (owner_id, source, name, kcal_per_100g)
    select null, 'argenfoods', 'quota shared ' || g, 100
    from generate_series(1, 5001) g$$,
  'the service role can import more than 5000 shared foods (owner_id null)'
);

select * from finish();

rollback;
