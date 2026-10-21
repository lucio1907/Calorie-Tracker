-- Two-factor enforcement (migration mfa_aal2_policies):
-- - every public table carries the restrictive aal2 policy;
-- - a user with a verified factor sees and changes nothing at aal1, on every
--   table and through the RPCs, and works normally at aal2;
-- - users without a verified factor (none, or only an unverified one) keep
--   working at aal1, with or without an `aal` claim.
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(59);

-- Structure ------------------------------------------------------------------

select is_empty(
  $$select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not exists (
        select 1
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = c.relname
          and p.permissive = 'RESTRICTIVE'
          and p.cmd = 'ALL'
          and p.roles = '{authenticated}'
          and p.qual = '( SELECT private.mfa_satisfied() AS mfa_satisfied)'
      )$$,
  'every public table has the restrictive aal2 policy'
);

select ok(
  not has_function_privilege('anon', 'private.mfa_satisfied()', 'execute')
    and has_function_privilege('authenticated', 'private.mfa_satisfied()', 'execute'),
  'the check is executable by authenticated only'
);

-- Fixtures (as postgres, bypassing RLS) -------------------------------------
-- A: no factor. B: a verified TOTP factor. C: an unverified TOTP factor only.

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-00000000aa01', 'mfa-a@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-00000000aa02', 'mfa-b@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-00000000aa03', 'mfa-c@local.test', 'authenticated', 'authenticated');

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values
  ('00000000-0000-4000-a000-00000000ab02', '00000000-0000-4000-a000-00000000aa02', '', 'totp', 'verified', now(), now()),
  ('00000000-0000-4000-a000-00000000ab03', '00000000-0000-4000-a000-00000000aa03', '', 'totp', 'unverified', now(), now());

-- The profile insert also writes each user's first profile_versions row.
insert into public.profiles (user_id, goal, goal_kg_per_week)
values
  ('00000000-0000-4000-a000-00000000aa01', 'maintain', 0),
  ('00000000-0000-4000-a000-00000000aa02', 'maintain', 0),
  ('00000000-0000-4000-a000-00000000aa03', 'maintain', 0);

insert into public.foods (id, owner_id, source, name, kcal_per_100g)
overriding system value
values
  (920001, null, 'argenfoods', 'Mfa shared food', 100),
  (920002, '00000000-0000-4000-a000-00000000aa02', 'custom', 'Mfa food of B', 200);

insert into public.activities (id, owner_id, name, met, category)
overriding system value
values
  (920101, null, 'Mfa shared activity', 4.0, 'walking'),
  (920102, '00000000-0000-4000-a000-00000000aa02', 'Mfa activity of B', 5.0, 'other');

insert into public.food_portions (id, food_id, label, grams)
overriding system value
values (920201, 920002, 'B slice', 25);

insert into public.food_favorites (user_id, food_id)
values ('00000000-0000-4000-a000-00000000aa02', 920001);

insert into public.recipes (id, user_id, name)
overriding system value
values (920301, '00000000-0000-4000-a000-00000000aa02', 'B recipe');

insert into public.recipe_items (id, recipe_id, food_id, grams)
overriding system value
values (920401, 920301, 920002, 100);

insert into public.food_entries (id, user_id, entry_date, meal, food_id, label, grams, kcal)
overriding system value
values
  (920501, '00000000-0000-4000-a000-00000000aa01', current_date, 'lunch', 920001, 'A lunch', 100, 100),
  (920502, '00000000-0000-4000-a000-00000000aa02', current_date, 'lunch', 920002, 'B lunch', 100, 200),
  (920503, '00000000-0000-4000-a000-00000000aa03', current_date, 'lunch', 920001, 'C lunch', 100, 100);

insert into public.activity_entries (id, user_id, entry_date, activity_id, label, minutes, kcal)
overriding system value
values (920601, '00000000-0000-4000-a000-00000000aa02', current_date, 920102, 'B workout', 30, 150);

insert into public.weight_entries (id, user_id, entry_date, kg)
overriding system value
values (920701, '00000000-0000-4000-a000-00000000aa02', current_date, 80);

set local role authenticated;

-- B at aal1: sees nothing --------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000aa02","role":"authenticated","aal":"aal1"}', true);

select is((select count(*) from public.profiles), 0::bigint, 'aal1 with a verified factor: no profiles');
select is((select count(*) from public.profile_versions), 0::bigint, 'aal1 with a verified factor: no profile versions');
select is((select count(*) from public.foods), 0::bigint, 'aal1 with a verified factor: no foods, not even the shared catalog');
select is((select count(*) from public.food_portions), 0::bigint, 'aal1 with a verified factor: no food portions');
select is((select count(*) from public.food_favorites), 0::bigint, 'aal1 with a verified factor: no favorites');
select is((select count(*) from public.recipes), 0::bigint, 'aal1 with a verified factor: no recipes');
select is((select count(*) from public.recipe_items), 0::bigint, 'aal1 with a verified factor: no recipe items');
select is((select count(*) from public.food_entries), 0::bigint, 'aal1 with a verified factor: no food entries');
select is((select count(*) from public.activities), 0::bigint, 'aal1 with a verified factor: no activities, not even the shared catalog');
select is((select count(*) from public.activity_entries), 0::bigint, 'aal1 with a verified factor: no activity entries');
select is((select count(*) from public.weight_entries), 0::bigint, 'aal1 with a verified factor: no weight entries');

-- B at aal1: inserts fail ----------------------------------------------------------

select throws_ok(
  $$insert into public.profiles (user_id, goal, goal_kg_per_week)
    values ('00000000-0000-4000-a000-00000000aa02', 'lose', 0.5)
    on conflict (user_id) do update set goal = excluded.goal$$,
  '42501', null,
  'aal1 with a verified factor: cannot upsert the profile'
);
select throws_ok(
  $$insert into public.foods (owner_id, source, name, kcal_per_100g)
    values ('00000000-0000-4000-a000-00000000aa02', 'custom', 'forged', 1)$$,
  '42501', null,
  'aal1 with a verified factor: cannot insert a food'
);
select throws_ok(
  $$insert into public.food_portions (food_id, label, grams) values (920002, 'forged', 1)$$,
  '42501', null,
  'aal1 with a verified factor: cannot insert a food portion'
);
select throws_ok(
  $$insert into public.food_favorites (user_id, food_id) values ('00000000-0000-4000-a000-00000000aa02', 920002)$$,
  '42501', null,
  'aal1 with a verified factor: cannot insert a favorite'
);
select throws_ok(
  $$insert into public.recipes (user_id, name) values ('00000000-0000-4000-a000-00000000aa02', 'forged')$$,
  '42501', null,
  'aal1 with a verified factor: cannot insert a recipe'
);
select throws_ok(
  $$insert into public.recipe_items (recipe_id, food_id, grams) values (920301, 920002, 1)$$,
  '42501', null,
  'aal1 with a verified factor: cannot insert a recipe item'
);
select throws_ok(
  $$insert into public.food_entries (user_id, entry_date, meal, label, grams, kcal)
    values ('00000000-0000-4000-a000-00000000aa02', current_date, 'dinner', 'forged', 1, 1)$$,
  '42501', null,
  'aal1 with a verified factor: cannot insert a food entry'
);
select throws_ok(
  $$insert into public.activities (owner_id, name, met, category)
    values ('00000000-0000-4000-a000-00000000aa02', 'forged', 3, 'other')$$,
  '42501', null,
  'aal1 with a verified factor: cannot insert an activity'
);
select throws_ok(
  $$insert into public.activity_entries (user_id, entry_date, label, minutes, kcal)
    values ('00000000-0000-4000-a000-00000000aa02', current_date, 'forged', 1, 1)$$,
  '42501', null,
  'aal1 with a verified factor: cannot insert an activity entry'
);
select throws_ok(
  $$insert into public.weight_entries (user_id, entry_date, kg)
    values ('00000000-0000-4000-a000-00000000aa02', current_date - 1, 79)$$,
  '42501', null,
  'aal1 with a verified factor: cannot insert a weight entry'
);

-- B at aal1: updates and deletes touch nothing -----------------------------------
-- One statement per table, summed: each table must report 0 changed rows.

select results_eq(
  $$with
     p as (update public.profiles set height_cm = 150 returning 1),
     f as (update public.foods set kcal_per_100g = 1 returning 1),
     fp as (update public.food_portions set grams = 1 returning 1),
     r as (update public.recipes set name = 'x' returning 1),
     ri as (update public.recipe_items set grams = 1 returning 1),
     fe as (update public.food_entries set kcal = 1 returning 1),
     a as (update public.activities set met = 1 returning 1),
     ae as (update public.activity_entries set kcal = 1 returning 1),
     w as (update public.weight_entries set kg = 1 returning 1)
   select (select count(*) from p) + (select count(*) from f) + (select count(*) from fp)
     + (select count(*) from r) + (select count(*) from ri) + (select count(*) from fe)
     + (select count(*) from a) + (select count(*) from ae) + (select count(*) from w)$$,
  array[0::bigint],
  'aal1 with a verified factor: updates change no row on any table'
);

select results_eq(
  $$with
     f as (delete from public.foods returning 1),
     fp as (delete from public.food_portions returning 1),
     fv as (delete from public.food_favorites returning 1),
     r as (delete from public.recipes returning 1),
     ri as (delete from public.recipe_items returning 1),
     fe as (delete from public.food_entries returning 1),
     a as (delete from public.activities returning 1),
     ae as (delete from public.activity_entries returning 1),
     w as (delete from public.weight_entries returning 1)
   select (select count(*) from f) + (select count(*) from fp) + (select count(*) from fv)
     + (select count(*) from r) + (select count(*) from ri) + (select count(*) from fe)
     + (select count(*) from a) + (select count(*) from ae) + (select count(*) from w)$$,
  array[0::bigint],
  'aal1 with a verified factor: deletes remove no row from any table'
);

-- B at aal1: RPCs ----------------------------------------------------------------

select is((select count(*) from public.search_foods('', false, 50)), 0::bigint, 'aal1 with a verified factor: search_foods returns nothing');
select is((select count(*) from public.recent_foods(10)), 0::bigint, 'aal1 with a verified factor: recent_foods returns nothing');
select is(
  (select count(*) from public.daily_energy_totals(current_date - 1, current_date)), 0::bigint,
  'aal1 with a verified factor: daily_energy_totals returns nothing'
);
select throws_ok(
  $$select public.consume_off_request('search')$$,
  '42501', 'second factor required',
  'aal1 with a verified factor: cannot take an OFF request slot'
);
select throws_ok(
  $$select public.off_barcode_recently_missed('7790000000001')$$,
  '42501', 'second factor required',
  'aal1 with a verified factor: cannot read the barcode miss cache'
);
select throws_ok(
  $$select public.record_off_barcode_miss('7790000000001')$$,
  '42501', 'second factor required',
  'aal1 with a verified factor: cannot write the barcode miss cache'
);

-- A token without an `aal` claim is aal1 too.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000aa02","role":"authenticated"}', true);

select is((select count(*) from public.food_entries), 0::bigint, 'no aal claim with a verified factor: no food entries');

-- B at aal2: everything works -----------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000aa02","role":"authenticated","aal":"aal2"}', true);

select is((select count(*) from public.profiles), 1::bigint, 'aal2: B sees their profile');
select is((select count(*) from public.profile_versions), 1::bigint, 'aal2: B sees their profile version');
select is(
  (select count(*) from public.foods where id in (920001, 920002)), 2::bigint,
  'aal2: B sees the shared food and their own'
);
select is((select count(*) from public.food_portions), 1::bigint, 'aal2: B sees their food portion');
select is((select count(*) from public.food_favorites), 1::bigint, 'aal2: B sees their favorite');
select is((select count(*) from public.recipes), 1::bigint, 'aal2: B sees their recipe');
select is((select count(*) from public.recipe_items), 1::bigint, 'aal2: B sees their recipe item');
select results_eq(
  'select id from public.food_entries order by id',
  array[920502::bigint],
  'aal2: B sees their own food entry only'
);
select is(
  (select count(*) from public.activities where id in (920101, 920102)), 2::bigint,
  'aal2: B sees the shared activity and their own'
);
select is((select count(*) from public.activity_entries), 1::bigint, 'aal2: B sees their activity entry');
select is((select count(*) from public.weight_entries), 1::bigint, 'aal2: B sees their weight entry');
select is(
  (select count(*) from public.daily_energy_totals(current_date - 1, current_date)), 1::bigint,
  'aal2: daily_energy_totals returns B''s day'
);
select ok(public.consume_off_request('search'), 'aal2: B can take an OFF request slot');

select lives_ok(
  $$insert into public.weight_entries (user_id, entry_date, kg)
    values ('00000000-0000-4000-a000-00000000aa02', current_date - 1, 79)$$,
  'aal2: B can insert a weight entry'
);
select results_eq(
  $$with changed as (update public.weight_entries set kg = 81 where id = 920701 returning 1) select count(*) from changed$$,
  array[1::bigint],
  'aal2: B can update a weight entry'
);
select results_eq(
  $$with changed as (update public.profiles set height_cm = 175 returning 1) select count(*) from changed$$,
  array[1::bigint],
  'aal2: B can update their profile'
);
select results_eq(
  $$with removed as (delete from public.food_entries where id = 920502 returning 1) select count(*) from removed$$,
  array[1::bigint],
  'aal2: B can delete a food entry'
);

-- A (no factor): unaffected, with or without an aal claim -------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000aa01","role":"authenticated","aal":"aal1"}', true);

select results_eq(
  'select id from public.food_entries order by id',
  array[920501::bigint],
  'aal1 without a factor: A sees their own food entry'
);
select is((select count(*) from public.profiles), 1::bigint, 'aal1 without a factor: A sees their profile');
select lives_ok(
  $$insert into public.weight_entries (user_id, entry_date, kg)
    values ('00000000-0000-4000-a000-00000000aa01', current_date, 70)$$,
  'aal1 without a factor: A can insert a weight entry'
);
select ok(public.consume_off_request('search'), 'aal1 without a factor: A can take an OFF request slot');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000aa01","role":"authenticated"}', true);

select results_eq(
  'select id from public.food_entries order by id',
  array[920501::bigint],
  'no aal claim without a factor: A sees their own food entry'
);
select results_eq(
  $$with changed as (update public.profiles set height_cm = 170 returning 1) select count(*) from changed$$,
  array[1::bigint],
  'no aal claim without a factor: A can update their profile'
);

-- C (unverified factor only): unaffected ---------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000aa03","role":"authenticated","aal":"aal1"}', true);

select results_eq(
  'select id from public.food_entries order by id',
  array[920503::bigint],
  'aal1 with an unverified factor: C sees their own food entry'
);
select is(
  (select count(*) from public.foods where id = 920001), 1::bigint,
  'aal1 with an unverified factor: C sees the shared catalog'
);
select lives_ok(
  $$insert into public.weight_entries (user_id, entry_date, kg)
    values ('00000000-0000-4000-a000-00000000aa03', current_date, 60)$$,
  'aal1 with an unverified factor: C can insert a weight entry'
);

-- Verifying C's factor turns the rule on for C at once ---------------------------------

reset role;
update auth.mfa_factors set status = 'verified' where id = '00000000-0000-4000-a000-00000000ab03';
set local role authenticated;

select is((select count(*) from public.food_entries), 0::bigint, 'aal1 once the factor is verified: C sees nothing');

select * from finish();

rollback;
