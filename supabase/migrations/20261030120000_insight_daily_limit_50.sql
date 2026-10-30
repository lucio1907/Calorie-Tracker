-- AI generation limit: 50 attempts per user and app day (was 10).
--
-- The app has a single user and signups are closed, so the per-user limit now
-- matches the shared OpenRouter free quota (one API key, 50 requests per day)
-- instead of reserving most of it for accounts that do not exist. If signups
-- open, lower max_requests again: one account could then spend the whole
-- deployment's quota.
--
-- Only the constant and the comment change; the body is otherwise the one
-- from 20261029120000_ai_insights.sql.

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
  max_requests constant int := 50;
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
  'Takes one AI generation slot for the caller in the current app day (America/Argentina/Buenos_Aires); false when the 50 attempts per day are used.';

-- create or replace keeps the existing grants; restated so this file stands alone.
revoke all on function public.consume_insight_request() from public, anon;
grant execute on function public.consume_insight_request() to authenticated;
