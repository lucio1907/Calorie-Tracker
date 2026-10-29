-- AI insights (migration ai_insights):
-- - daily_macro_totals sums only the caller's protein, carbs and fat per day
--   and rejects missing, reversed and over-366-day ranges;
-- - public.insights holds one summary per owner, range and day: owners read
--   and insert only their own rows, never update or delete them, and the
--   aal2 rule and a row quota apply as on the other user tables;
-- - consume_insight_request allows 3 generations per user and app day
--   (America/Argentina/Buenos_Aires); its counters are unreachable directly.
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(52);

-- Structure and privileges ---------------------------------------------------

select ok(
  (select relrowsecurity from pg_class where oid = 'public.insights'::regclass),
  'insights has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.insight_request_counters'::regclass),
  'insight_request_counters has RLS enabled'
);
select ok(
  exists (
    select 1 from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'insights'
      and p.permissive = 'RESTRICTIVE'
      and p.cmd = 'ALL'
      and p.roles = '{authenticated}'
      and p.qual = '( SELECT private.mfa_satisfied() AS mfa_satisfied)'
  ),
  'insights has the restrictive aal2 policy'
);
select has_trigger('public', 'insights', 'insights_enforce_row_quota', 'insights has the row-quota trigger');

select ok(
  not has_table_privilege('anon', 'public.insights', 'select, insert, update, delete, truncate, references, trigger'),
  'anon has no privilege on insights'
);
select ok(
  has_table_privilege('authenticated', 'public.insights', 'select')
    and has_table_privilege('authenticated', 'public.insights', 'insert'),
  'authenticated can select and insert insights'
);
select ok(
  not has_table_privilege('authenticated', 'public.insights', 'update, delete, truncate, references, trigger'),
  'authenticated cannot update or delete insights'
);

select ok(
  not has_function_privilege('anon', 'public.daily_macro_totals(date, date)', 'execute'),
  'anon cannot execute daily_macro_totals'
);
select ok(
  not has_function_privilege('anon', 'public.consume_insight_request()', 'execute'),
  'anon cannot execute consume_insight_request'
);
select ok(
  has_function_privilege('authenticated', 'public.daily_macro_totals(date, date)', 'execute')
    and has_function_privilege('authenticated', 'public.consume_insight_request()', 'execute'),
  'authenticated can execute both functions'
);

-- Fixtures (as postgres, bypassing RLS) -------------------------------------
-- A and B: no MFA factor. C: a verified TOTP factor.

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-0000000000e1', 'insights-a@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000e2', 'insights-b@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000e3', 'insights-c@local.test', 'authenticated', 'authenticated');

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values ('00000000-0000-4000-a000-0000000000f3', '00000000-0000-4000-a000-0000000000e3', '', 'totp', 'verified', now(), now());

insert into public.food_entries (user_id, entry_date, meal, label, grams, kcal, protein, carbs, fat)
values
  ('00000000-0000-4000-a000-0000000000e1', '2026-10-10', 'lunch', 'A lunch', 100, 600, 30.25, 50, 10.5),
  ('00000000-0000-4000-a000-0000000000e1', '2026-10-10', 'dinner', 'A dinner', 100, 700, 40, 60.75, 20),
  ('00000000-0000-4000-a000-0000000000e1', '2026-10-11', 'lunch', 'A lunch', 100, 500, 25, 0, 5),
  ('00000000-0000-4000-a000-0000000000e1', '2026-09-01', 'lunch', 'A out of range', 100, 999, 99, 99, 99),
  ('00000000-0000-4000-a000-0000000000e2', '2026-10-10', 'lunch', 'B lunch', 100, 1234, 12, 34, 56);

insert into public.insights (owner_id, range_days, generated_on, content, model)
values ('00000000-0000-4000-a000-0000000000e3', 30, '2026-10-29', '{"overview":"C"}', 'test-model');

-- Anon -----------------------------------------------------------------------

set local role anon;

select throws_ok(
  $$select * from public.daily_macro_totals('2026-10-01', '2026-10-31')$$,
  '42501', null,
  'anon cannot call daily_macro_totals'
);
select throws_ok(
  $$select public.consume_insight_request()$$,
  '42501', null,
  'anon cannot take an insight slot'
);
select throws_ok(
  $$select * from public.insights$$,
  '42501', null,
  'anon cannot read insights'
);

reset role;

-- No signed-in user ----------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);

select throws_ok(
  $$select public.consume_insight_request()$$,
  '42501', 'not signed in',
  'consume_insight_request requires a signed-in user'
);

-- User A: daily_macro_totals ---------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000e1","role":"authenticated"}', true);

select results_eq(
  $$select entry_date, protein_g, carbs_g, fat_g from public.daily_macro_totals('2026-10-01', '2026-10-31')$$,
  $$values
      ('2026-10-10'::date, 70.25::numeric, 110.75::numeric, 30.5::numeric),
      ('2026-10-11'::date, 25::numeric, 0::numeric, 5::numeric)$$,
  'daily_macro_totals sums only A''s macros per day, inside the range'
);
select is_empty(
  $$select * from public.daily_macro_totals('2026-10-13', '2026-10-20')$$,
  'a range without entries returns no rows'
);
select throws_ok(
  $$select * from public.daily_macro_totals('2026-10-20', '2026-10-01')$$,
  '22023', null,
  'a reversed range is rejected'
);
select throws_ok(
  $$select * from public.daily_macro_totals('2025-01-01', '2026-10-01')$$,
  '22023', null,
  'a range longer than 366 days is rejected'
);
select throws_ok(
  $$select * from public.daily_macro_totals(null, '2026-10-01')$$,
  '22023', null,
  'a missing bound is rejected'
);

-- User A: insights -------------------------------------------------------------

select lives_ok(
  $$insert into public.insights (range_days, generated_on, content, model)
    values (7, '2026-10-29', '{"overview":"A seven"}', 'test-model')$$,
  'A can insert a summary'
);
select results_eq(
  $$select owner_id from public.insights$$,
  array['00000000-0000-4000-a000-0000000000e1'::uuid],
  'owner_id defaults to the caller and A sees only their own summary'
);
select throws_ok(
  $$insert into public.insights (range_days, generated_on, content, model)
    values (7, '2026-10-29', '{"overview":"again"}', 'test-model')$$,
  '23505', null,
  'one summary per owner, range and day'
);
select lives_ok(
  $$insert into public.insights (range_days, generated_on, content, model)
    values (30, '2026-10-29', '{"overview":"A thirty"}', 'test-model')$$,
  'another range on the same day is a separate summary'
);
select lives_ok(
  $$insert into public.insights (range_days, generated_on, content, model)
    values (7, '2026-10-30', '{"overview":"A next day"}', 'test-model')$$,
  'the same range on another day is a separate summary'
);
select throws_ok(
  $$insert into public.insights (range_days, generated_on, content, model)
    values (14, '2026-10-29', '{"overview":"x"}', 'test-model')$$,
  '23514', null,
  'range_days must be 7, 30 or 90'
);
select throws_ok(
  $$insert into public.insights (range_days, generated_on, content, model)
    values (90, '2026-10-29', '["not", "an", "object"]', 'test-model')$$,
  '23514', null,
  'content must be a JSON object'
);
select throws_ok(
  $$insert into public.insights (range_days, generated_on, content, model)
    values (90, '2026-10-29', jsonb_build_object('overview', repeat('x', 9000)), 'test-model')$$,
  '23514', null,
  'content larger than 8 KiB is rejected'
);
select throws_ok(
  $$insert into public.insights (range_days, generated_on, content, model)
    values (90, '2026-10-29', '{"overview":"x"}', '')$$,
  '23514', null,
  'model must not be empty'
);
select throws_ok(
  $$insert into public.insights (owner_id, range_days, generated_on, content, model)
    values ('00000000-0000-4000-a000-0000000000e2', 90, '2026-10-29', '{"overview":"x"}', 'test-model')$$,
  '42501', null,
  'A cannot insert a summary for B'
);
select throws_ok(
  $$update public.insights set model = 'other'$$,
  '42501', null,
  'A cannot update summaries'
);
select throws_ok(
  $$delete from public.insights$$,
  '42501', null,
  'A cannot delete summaries'
);
select results_eq(
  $$select range_days::int, generated_on from public.insights order by generated_on, range_days$$,
  $$values (7, '2026-10-29'::date), (30, '2026-10-29'::date), (7, '2026-10-30'::date)$$,
  'A sees exactly their own three summaries'
);

-- User B ---------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000e2","role":"authenticated"}', true);

select results_eq(
  $$select entry_date, protein_g, carbs_g, fat_g from public.daily_macro_totals('2026-10-01', '2026-10-31')$$,
  $$values ('2026-10-10'::date, 12::numeric, 34::numeric, 56::numeric)$$,
  'B gets only their own macro totals'
);
select is_empty(
  $$select * from public.insights$$,
  'B sees none of A''s or C''s summaries'
);
select lives_ok(
  $$insert into public.insights (range_days, generated_on, content, model)
    values (7, '2026-10-29', '{"overview":"B seven"}', 'test-model')$$,
  'B can store the same range and day as A'
);

-- User C: verified factor ------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000e3","role":"authenticated","aal":"aal1"}', true);

select is_empty(
  $$select * from public.insights$$,
  'aal1 with a verified factor: no summaries'
);
select throws_ok(
  $$insert into public.insights (range_days, generated_on, content, model)
    values (7, '2026-10-29', '{"overview":"C seven"}', 'test-model')$$,
  '42501', null,
  'aal1 with a verified factor: cannot insert a summary'
);
select throws_ok(
  $$select public.consume_insight_request()$$,
  '42501', null,
  'aal1 with a verified factor: cannot take an insight slot'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000e3","role":"authenticated","aal":"aal2"}', true);

select results_eq(
  $$select range_days::int from public.insights$$,
  array[30],
  'aal2: C sees their own summary'
);

-- Row quota ----------------------------------------------------------------------

reset role;

-- A already holds 3 summaries; fill up to the 2000 cap (as postgres).
insert into public.insights (owner_id, range_days, generated_on, content, model)
select '00000000-0000-4000-a000-0000000000e1', 90, date '2020-01-01' + g, '{"overview":"filler"}', 'test-model'
from generate_series(1, 1997) g;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000e1","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.insights (range_days, generated_on, content, model)
    values (90, '2026-10-29', '{"overview":"one too many"}', 'test-model')$$,
  '23514', null,
  'an owner holds at most 2000 summaries'
);

-- consume_insight_request: counters are unreachable ----------------------------------

select throws_ok(
  $$select * from private.insight_request_counters$$,
  '42501', null,
  'a signed-in user cannot read the counters'
);
select throws_ok(
  $$insert into private.insight_request_counters (user_id, window_day, request_count)
    values ('00000000-0000-4000-a000-0000000000e1', current_date, 1)$$,
  '42501', null,
  'a signed-in user cannot insert counters'
);
select throws_ok(
  $$update private.insight_request_counters set request_count = 1$$,
  '42501', null,
  'a signed-in user cannot reset the counters'
);
select throws_ok(
  $$delete from private.insight_request_counters$$,
  '42501', null,
  'a signed-in user cannot delete the counters'
);

-- consume_insight_request: limits ------------------------------------------------------

select is(
  (select array_agg(public.consume_insight_request()) from generate_series(1, 4)),
  array[true, true, true, false],
  'three generations per day, the 4th is refused'
);
select is(
  public.consume_insight_request(),
  false,
  'generation stays refused for the rest of the day'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000e2","role":"authenticated"}', true);

select is(public.consume_insight_request(), true, 'another user still has generations');

reset role;

select results_eq(
  $$select window_day, request_count from private.insight_request_counters
    where user_id = '00000000-0000-4000-a000-0000000000e1'$$,
  $$values ((now() at time zone 'America/Argentina/Buenos_Aires')::date, 3)$$,
  'the counter is keyed by the app-time-zone day and never grows past the limit'
);

-- A new day (moved back as postgres).
update private.insight_request_counters
set window_day = window_day - 1
where user_id = '00000000-0000-4000-a000-0000000000e1';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000e1","role":"authenticated"}', true);

select is(public.consume_insight_request(), true, 'the limit starts over on a new day');

reset role;

select results_eq(
  $$select window_day, request_count from private.insight_request_counters
    where user_id = '00000000-0000-4000-a000-0000000000e1'$$,
  $$values ((now() at time zone 'America/Argentina/Buenos_Aires')::date, 1)$$,
  'past days of the caller are deleted'
);
select is(
  (select count(*)::int from private.insight_request_counters where user_id = '00000000-0000-4000-a000-0000000000e2'),
  1,
  'other users'' days are left alone'
);
select ok(
  not exists (
    select 1 from pg_constraint
    where conrelid = 'private.insight_request_counters'::regclass
      and contype = 'f'
      and confdeltype <> 'c'
  ) and exists (
    select 1 from pg_constraint
    where conrelid = 'private.insight_request_counters'::regclass
      and contype = 'f'
      and confrelid = 'auth.users'::regclass
  ),
  'counters reference auth.users and are deleted with the user'
);

select * from finish();

rollback;
