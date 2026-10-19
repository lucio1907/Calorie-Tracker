-- RLS proof for Progress: editing and deleting public.weight_entries by id and
-- date, and public.daily_energy_totals() (SECURITY INVOKER, so RLS on
-- food_entries and activity_entries decides what it sums).
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

-- Fixtures (as postgres, bypassing RLS) -------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-0000000000d1', 'rls-progress-a@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000d2', 'rls-progress-b@local.test', 'authenticated', 'authenticated');

insert into public.weight_entries (id, user_id, entry_date, kg)
overriding system value
values
  (910001, '00000000-0000-4000-a000-0000000000d1', '2026-10-10', 81),
  (910002, '00000000-0000-4000-a000-0000000000d1', '2026-10-12', 80.5),
  (910003, '00000000-0000-4000-a000-0000000000d2', '2026-10-10', 60);

insert into public.food_entries (user_id, entry_date, meal, label, grams, kcal)
values
  ('00000000-0000-4000-a000-0000000000d1', '2026-10-10', 'lunch', 'A lunch', 100, 600.25),
  ('00000000-0000-4000-a000-0000000000d1', '2026-10-10', 'dinner', 'A dinner', 100, 700.50),
  ('00000000-0000-4000-a000-0000000000d1', '2026-10-11', 'lunch', 'A lunch', 100, 500),
  ('00000000-0000-4000-a000-0000000000d1', '2026-09-01', 'lunch', 'A out of range', 100, 999),
  ('00000000-0000-4000-a000-0000000000d2', '2026-10-10', 'lunch', 'B lunch', 100, 1234);

insert into public.activity_entries (user_id, entry_date, label, minutes, kcal)
values
  ('00000000-0000-4000-a000-0000000000d1', '2026-10-10', 'A run', 30, 300),
  ('00000000-0000-4000-a000-0000000000d1', '2026-10-12', 'A walk', 60, 250.75),
  ('00000000-0000-4000-a000-0000000000d2', '2026-10-12', 'B swim', 60, 500);

-- User A ---------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d1","role":"authenticated"}', true);

select results_eq(
  $$with changed as (update public.weight_entries set kg = 79.8 where id = 910002 returning id) select count(*) from changed$$,
  array[1::bigint],
  'A can edit their own weight entry'
);

select results_eq(
  $$with changed as (update public.weight_entries set entry_date = '2026-10-11' where id = 910002 returning id) select count(*) from changed$$,
  array[1::bigint],
  'A can move their own weight entry to a free date'
);

select throws_ok(
  $$update public.weight_entries set entry_date = '2026-10-10' where id = 910002$$,
  '23505', null,
  'moving an entry onto a date that already has one violates the one-per-day rule'
);

select results_eq(
  $$with changed as (update public.weight_entries set kg = 99 where id = 910003 returning id) select count(*) from changed$$,
  array[0::bigint],
  'A cannot edit B''s weight entry'
);

select throws_ok(
  $$update public.weight_entries set user_id = '00000000-0000-4000-a000-0000000000d2' where id = 910001$$,
  '42501', null,
  'A cannot hand their weight entry to B'
);

select results_eq(
  $$with gone as (delete from public.weight_entries where id = 910003 returning id) select count(*) from gone$$,
  array[0::bigint],
  'A cannot delete B''s weight entry'
);

select results_eq(
  $$with gone as (delete from public.weight_entries where id = 910001 returning id) select count(*) from gone$$,
  array[1::bigint],
  'A can delete their own weight entry'
);

select results_eq(
  $$select entry_date, kg from public.weight_entries order by entry_date$$,
  $$values ('2026-10-11'::date, 79.8::numeric(5, 2))$$,
  'A is left with the edited entry only'
);

select results_eq(
  $$select entry_date, food_kcal, exercise_kcal from public.daily_energy_totals('2026-10-01', '2026-10-31')$$,
  $$values
      ('2026-10-10'::date, 1300.75::numeric, 300::numeric),
      ('2026-10-11'::date, 500::numeric, 0::numeric),
      ('2026-10-12'::date, 0::numeric, 250.75::numeric)$$,
  'daily_energy_totals sums only A''s food and exercise per day, inside the range'
);

select is_empty(
  $$select * from public.daily_energy_totals('2026-10-13', '2026-10-20')$$,
  'a range without entries returns no rows'
);

select throws_ok(
  $$select * from public.daily_energy_totals('2026-10-20', '2026-10-01')$$,
  '22023', null,
  'a reversed range is rejected'
);

select throws_ok(
  $$select * from public.daily_energy_totals('2025-01-01', '2026-10-01')$$,
  '22023', null,
  'a range longer than 366 days is rejected'
);

select throws_ok(
  $$select * from public.daily_energy_totals(null, '2026-10-01')$$,
  '22023', null,
  'a missing bound is rejected'
);

-- User B ---------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d2","role":"authenticated"}', true);

select results_eq(
  'select kg from public.weight_entries',
  array[60::numeric(5, 2)],
  'B''s weight is untouched'
);

select results_eq(
  $$select entry_date, food_kcal, exercise_kcal from public.daily_energy_totals('2026-10-01', '2026-10-31')$$,
  $$values ('2026-10-10'::date, 1234::numeric, 0::numeric), ('2026-10-12'::date, 0::numeric, 500::numeric)$$,
  'B gets only their own totals'
);

-- Anonymous ------------------------------------------------------------------

set local role anon;

select throws_ok(
  $$select * from public.daily_energy_totals('2026-10-01', '2026-10-31')$$,
  '42501', null,
  'anon cannot call daily_energy_totals'
);

select * from finish();

rollback;
