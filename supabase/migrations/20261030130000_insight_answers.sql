-- AI answers to the predefined questions of the AI section.
--
-- Like public.insights, each answer is generated with the shared free
-- OpenRouter quota and stored, so a reload or asking the same question again
-- on the same day spends nothing: one answer per owner, question, range and
-- app day. Generation takes a slot from public.consume_insight_request, the
-- same daily limit as the summaries.
--
-- Questions are a fixed list (QUESTION_KEYS in
-- src/features/insights/lib/insight-questions.ts); adding one needs a new
-- check constraint here.
--
-- Errors:
-- - 23505 (unique_violation) for a second answer of the same question, range
--   and day; 23514 (check_violation) for an unknown question or range,
--   content that is not an object or is over 8 KiB, an empty model, or the
--   row quota; 42501 when RLS or the aal2 rule rejects the row.

create table public.insight_answers (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question text not null check (question in ('weight', 'protein', 'weekend', 'consistency')),
  range_days smallint not null check (range_days in (7, 30, 90)),
  generated_on date not null,
  content jsonb not null check (
    pg_catalog.jsonb_typeof(content) = 'object'
    and pg_catalog.octet_length(content::text) <= 8192
  ),
  model text not null check (char_length(model) between 1 and 200),
  created_at timestamptz not null default now(),
  -- Also the index for the owner lookups: RLS filter, FK cascade, row quota
  -- and the "today's answers for this range" read.
  constraint insight_answers_owner_question_range_day_key unique (owner_id, question, range_days, generated_on)
);

comment on table public.insight_answers is
  'AI answers to predefined questions, one per owner, question, range (7, 30 or 90 days) and app day. Insert-only for the owner.';

alter table public.insight_answers enable row level security;

revoke all on table public.insight_answers from public, anon, authenticated;
grant select, insert on table public.insight_answers to authenticated;
grant select, insert, update, delete on table public.insight_answers to service_role;

create policy "insight_answers: owner can select"
  on public.insight_answers for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "insight_answers: owner can insert"
  on public.insight_answers for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

-- Same rule as the other user tables (mfa_aal2_policies).
create policy "insight_answers: aal2 when MFA is enabled"
  on public.insight_answers as restrictive for all
  to authenticated
  using ((select private.mfa_satisfied()));

-- Four questions for three ranges a day are at most ~4400 rows a year, far
-- above real use (each answer is asked for by hand).
create trigger insight_answers_enforce_row_quota
  before insert on public.insight_answers
  for each row execute function private.enforce_row_quota('5000', 'owner_id');
