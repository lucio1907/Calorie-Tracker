-- AI answers to predefined questions (migration insight_answers):
-- - public.insight_answers holds one answer per owner, question, range and
--   day: owners read and insert only their own rows, never update or delete
--   them, and the aal2 rule and a row quota apply as on public.insights;
-- - only the four known questions and the 7, 30 and 90 day ranges are stored.
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(26);

-- Structure and privileges ---------------------------------------------------

select ok(
  (select relrowsecurity from pg_class where oid = 'public.insight_answers'::regclass),
  'insight_answers has RLS enabled'
);
select ok(
  exists (
    select 1 from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'insight_answers'
      and p.permissive = 'RESTRICTIVE'
      and p.cmd = 'ALL'
      and p.roles = '{authenticated}'
      and p.qual = '( SELECT private.mfa_satisfied() AS mfa_satisfied)'
  ),
  'insight_answers has the restrictive aal2 policy'
);
select has_trigger('public', 'insight_answers', 'insight_answers_enforce_row_quota', 'insight_answers has the row-quota trigger');
select ok(
  not has_table_privilege('anon', 'public.insight_answers', 'select, insert, update, delete, truncate, references, trigger'),
  'anon has no privilege on insight_answers'
);
select ok(
  has_table_privilege('authenticated', 'public.insight_answers', 'select')
    and has_table_privilege('authenticated', 'public.insight_answers', 'insert'),
  'authenticated can select and insert answers'
);
select ok(
  not has_table_privilege('authenticated', 'public.insight_answers', 'update, delete, truncate, references, trigger'),
  'authenticated cannot update or delete answers'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.insight_answers'::regclass
      and contype = 'f'
      and confrelid = 'auth.users'::regclass
      and confdeltype = 'c'
  ),
  'answers reference auth.users and are deleted with the user'
);

-- Fixtures (as postgres, bypassing RLS) -------------------------------------
-- A and B: no MFA factor. C: a verified TOTP factor.

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-0000000000d1', 'answers-a@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000d2', 'answers-b@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000d3', 'answers-c@local.test', 'authenticated', 'authenticated');

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values ('00000000-0000-4000-a000-0000000000c3', '00000000-0000-4000-a000-0000000000d3', '', 'totp', 'verified', now(), now());

insert into public.insight_answers (owner_id, question, range_days, generated_on, content, model)
values ('00000000-0000-4000-a000-0000000000d3', 'protein', 30, '2026-10-29', '{"answer":"C"}', 'test-model');

-- Anon -----------------------------------------------------------------------

set local role anon;

select throws_ok(
  $$select * from public.insight_answers$$,
  '42501', null,
  'anon cannot read answers'
);

-- User A -----------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d1","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.insight_answers (question, range_days, generated_on, content, model)
    values ('weight', 7, '2026-10-29', '{"answer":"A weight"}', 'test-model')$$,
  'A can insert an answer'
);
select results_eq(
  $$select owner_id from public.insight_answers$$,
  array['00000000-0000-4000-a000-0000000000d1'::uuid],
  'owner_id defaults to the caller and A sees only their own answer'
);
select throws_ok(
  $$insert into public.insight_answers (question, range_days, generated_on, content, model)
    values ('weight', 7, '2026-10-29', '{"answer":"again"}', 'test-model')$$,
  '23505', null,
  'one answer per owner, question, range and day'
);
select lives_ok(
  $$insert into public.insight_answers (question, range_days, generated_on, content, model)
    values ('protein', 7, '2026-10-29', '{"answer":"A protein"}', 'test-model')$$,
  'another question on the same range and day is a separate answer'
);
select lives_ok(
  $$insert into public.insight_answers (question, range_days, generated_on, content, model)
    values ('weight', 30, '2026-10-29', '{"answer":"A weight 30"}', 'test-model')$$,
  'the same question for another range is a separate answer'
);
select lives_ok(
  $$insert into public.insight_answers (question, range_days, generated_on, content, model)
    values ('weekend', 90, '2026-10-29', '{"answer":"A weekend"}', 'test-model'),
           ('consistency', 90, '2026-10-29', '{"answer":"A consistency"}', 'test-model')$$,
  'the weekend and consistency questions are stored'
);
select throws_ok(
  $$insert into public.insight_answers (question, range_days, generated_on, content, model)
    values ('anything', 7, '2026-10-29', '{"answer":"x"}', 'test-model')$$,
  '23514', null,
  'only the known questions are stored'
);
select throws_ok(
  $$insert into public.insight_answers (question, range_days, generated_on, content, model)
    values ('weight', 14, '2026-10-29', '{"answer":"x"}', 'test-model')$$,
  '23514', null,
  'range_days must be 7, 30 or 90'
);
select throws_ok(
  $$insert into public.insight_answers (question, range_days, generated_on, content, model)
    values ('weight', 90, '2026-10-29', '["not", "an", "object"]', 'test-model')$$,
  '23514', null,
  'content must be a JSON object'
);
select throws_ok(
  $$insert into public.insight_answers (question, range_days, generated_on, content, model)
    values ('weight', 90, '2026-10-29', jsonb_build_object('answer', repeat('x', 9000)), 'test-model')$$,
  '23514', null,
  'content larger than 8 KiB is rejected'
);
select throws_ok(
  $$insert into public.insight_answers (owner_id, question, range_days, generated_on, content, model)
    values ('00000000-0000-4000-a000-0000000000d2', 'weight', 90, '2026-10-29', '{"answer":"x"}', 'test-model')$$,
  '42501', null,
  'A cannot insert an answer for B'
);
select throws_ok(
  $$update public.insight_answers set model = 'other'$$,
  '42501', null,
  'A cannot update answers'
);
select throws_ok(
  $$delete from public.insight_answers$$,
  '42501', null,
  'A cannot delete answers'
);

-- User B ---------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d2","role":"authenticated"}', true);

select is_empty(
  $$select * from public.insight_answers$$,
  'B sees none of A''s or C''s answers'
);

-- User C: verified factor ------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d3","role":"authenticated","aal":"aal1"}', true);

select is_empty(
  $$select * from public.insight_answers$$,
  'aal1 with a verified factor: no answers'
);
select throws_ok(
  $$insert into public.insight_answers (question, range_days, generated_on, content, model)
    values ('weight', 7, '2026-10-29', '{"answer":"C"}', 'test-model')$$,
  '42501', null,
  'aal1 with a verified factor: cannot insert an answer'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d3","role":"authenticated","aal":"aal2"}', true);

select results_eq(
  $$select question from public.insight_answers$$,
  array['protein'],
  'aal2: C sees their own answer'
);

-- Row quota ----------------------------------------------------------------------

reset role;

-- A already holds 5 answers; fill up to the 5000 cap (as postgres).
insert into public.insight_answers (owner_id, question, range_days, generated_on, content, model)
select '00000000-0000-4000-a000-0000000000d1', 'weight', 90, date '2000-01-01' + g, '{"answer":"filler"}', 'test-model'
from generate_series(1, 4995) g;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d1","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.insight_answers (question, range_days, generated_on, content, model)
    values ('protein', 90, '2026-10-29', '{"answer":"one too many"}', 'test-model')$$,
  '23514', null,
  'an owner holds at most 5000 answers'
);

select * from finish();

rollback;
