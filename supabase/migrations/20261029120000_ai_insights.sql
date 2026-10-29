-- AI insights: an AI-written summary of how the user is doing, on Progress.
--
-- Three parts:
--
-- 1. public.daily_macro_totals(start_date, end_date): the caller's protein,
--    carbs and fat per day, summed in the database for the same reason as
--    daily_energy_totals (paging raw rows would hit the Data API max_rows cap
--    on busy ranges). Only days with at least one food entry are returned.
--    SECURITY INVOKER: RLS on food_entries (owner and aal2 policies) still
--    decides what the caller can read; the explicit user_id filter matches
--    the (user_id, entry_date) index.
--
-- 2. public.insights: one stored summary per owner, range (7, 30 or 90 days)
--    and day, so reloading Progress shows it again without a new model call.
--    Owners read and insert only their own rows. A summary is never edited or
--    removed by the user (there are no UPDATE or DELETE grants or policies);
--    rows go with the account (on delete cascade). The restrictive aal2
--    policy and a per-owner row quota apply as on every other user table.
--    content is bounded (a JSON object of at most 8 KiB as text) so the table
--    cannot be used as free storage through the Data API.
--
-- 3. public.consume_insight_request(): every summary is generated with a free
--    OpenRouter model whose quota is shared by the whole deployment (one API
--    key, 50 requests per day). Without a per-user limit one account could
--    spend it for everyone, so each user gets at most 10 generation attempts
--    per day. Failed attempts (upstream 429/5xx, timeouts, invalid answers)
--    count too, which keeps a retry loop from draining the shared quota; the
--    stored summaries themselves are already one per range and day.
--    The day is the app's calendar day (America/Argentina/Buenos_Aires,
--    APP_TIME_ZONE in src/lib/app-time.ts), so the limit resets at the same
--    midnight the diary uses. The counters live in `private` (no Data API
--    access) with RLS enabled and no policies; users must not be able to reset
--    them, so the only way in is this SECURITY DEFINER function, which takes
--    no user id: the caller is always auth.uid().
--
-- Error contract (read by the app):
-- - daily_macro_totals: SQLSTATE 22023 (invalid_parameter_value) for a
--   missing or reversed range, or one longer than 366 days;
-- - insights: 23505 (unique_violation) for a second summary of the same
--   range and day, 23514 (check_violation) for invalid values or the row
--   quota ("row_quota:insights:" prefix), 42501 for another owner's row or an
--   aal1 session of a user with a verified MFA factor;
-- - consume_insight_request: SQLSTATE 42501 (insufficient_privilege) when
--   there is no signed-in user or the session lacks the required second
--   factor; false (no error) when the day's limit is reached.

-- 1. Macros per day -------------------------------------------------------------

create or replace function public.daily_macro_totals(start_date date, end_date date)
returns table (
  entry_date date,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  if start_date is null or end_date is null or start_date > end_date then
    raise exception 'start_date must be on or before end_date' using errcode = '22023';
  end if;
  if end_date - start_date > 366 then
    raise exception 'the range can span at most 366 days' using errcode = '22023';
  end if;

  return query
  select
    f.entry_date,
    sum(f.protein)::numeric,
    sum(f.carbs)::numeric,
    sum(f.fat)::numeric
  from public.food_entries f
  where f.user_id = (select auth.uid())
    and f.entry_date between start_date and end_date
  group by f.entry_date
  order by f.entry_date;
end;
$$;

comment on function public.daily_macro_totals(date, date) is
  'The caller''s protein, carbs and fat grams per day between start_date and end_date (inclusive; RLS applies: SECURITY INVOKER).';

revoke all on function public.daily_macro_totals(date, date) from public, anon;
grant execute on function public.daily_macro_totals(date, date) to authenticated;

-- 2. Stored summaries ------------------------------------------------------------

create table public.insights (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  range_days smallint not null check (range_days in (7, 30, 90)),
  generated_on date not null,
  content jsonb not null check (
    pg_catalog.jsonb_typeof(content) = 'object'
    and pg_catalog.octet_length(content::text) <= 8192
  ),
  model text not null check (char_length(model) between 1 and 200),
  created_at timestamptz not null default now(),
  -- Also the index for the owner lookups: RLS filter, FK cascade, row quota
  -- and the "today's summary for this range" read.
  constraint insights_owner_id_range_days_generated_on_key unique (owner_id, range_days, generated_on)
);

comment on table public.insights is
  'AI-written progress summaries, one per owner, range (7, 30 or 90 days) and app day. Insert-only for the owner.';

alter table public.insights enable row level security;

revoke all on table public.insights from public, anon, authenticated;
grant select, insert on table public.insights to authenticated;
grant select, insert, update, delete on table public.insights to service_role;

create policy "insights: owner can select"
  on public.insights for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "insights: owner can insert"
  on public.insights for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

-- Same rule as the other user tables (mfa_aal2_policies).
create policy "insights: aal2 when MFA is enabled"
  on public.insights as restrictive for all
  to authenticated
  using ((select private.mfa_satisfied()));

-- Three ranges a day are at most ~1100 rows a year; 2000 is far above use.
create trigger insights_enforce_row_quota
  before insert on public.insights
  for each row execute function private.enforce_row_quota('2000', 'owner_id');

-- 3. Daily generation limit ------------------------------------------------------

create table private.insight_request_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  window_day date not null,
  request_count int not null check (request_count > 0),
  primary key (user_id, window_day)
);

comment on table private.insight_request_counters is
  'AI summary generations per user and app day. Written only by public.consume_insight_request.';

alter table private.insight_request_counters enable row level security;

revoke all on table private.insight_request_counters from public, anon, authenticated;

create or replace function public.consume_insight_request()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  -- The app's calendar day (APP_TIME_ZONE in src/lib/app-time.ts).
  current_day date := (pg_catalog.now() at time zone 'America/Argentina/Buenos_Aires')::date;
  max_requests constant int := 10;
begin
  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not private.mfa_satisfied() then
    raise exception 'second factor required' using errcode = '42501';
  end if;

  -- Past days are never read again: keep the table at one row per user.
  delete from private.insight_request_counters c
  where c.user_id = caller
    and c.window_day < current_day;

  -- Atomic take: concurrent calls serialize on the row. A full day is left
  -- untouched (the WHERE skips the update), so no row comes back.
  insert into private.insight_request_counters as c (user_id, window_day, request_count)
  values (caller, current_day, 1)
  on conflict (user_id, window_day) do update
    set request_count = c.request_count + 1
    where c.request_count < max_requests;

  return found;
end;
$$;

comment on function public.consume_insight_request() is
  'Takes one AI summary generation slot for the caller in the current app day (America/Argentina/Buenos_Aires); false when the 10 attempts per day are used.';

revoke all on function public.consume_insight_request() from public, anon;
grant execute on function public.consume_insight_request() to authenticated;
