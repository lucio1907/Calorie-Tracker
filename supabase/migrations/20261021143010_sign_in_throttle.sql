-- Sign-in throttle per client IP.
--
-- The login form posts to a Server Action, and the action calls Supabase Auth
-- from the deployment's server (Vercel). Auth limits sign-ins per IP
-- (config.toml [auth.rate_limit] sign_in_sign_ups), but the IP it sees is
-- Vercel's, shared by every visitor. So Auth's limit neither slows down one
-- person guessing passwords through our form nor stops that person from
-- spending the limit for everyone. The action therefore takes an attempt from
-- this throttle, keyed by the visitor's own IP, before it calls Auth. Vercel
-- instances share no memory, so the counters live here.
--
-- Limit (fixed 15-minute windows): 10 sign-in attempts per client, successful
-- or not. A person who mistypes a password a few times stays well under it;
-- a password guesser gets 40 tries an hour instead of Auth's whole shared
-- budget (30 per 5 minutes in config.toml).
--
-- Client keys are the SHA-256 hex digest of the client IP, computed by the
-- app; the raw IP is never stored. The digest is pseudonymous, not anonymous
-- (the IPv4 space is small enough to enumerate), which is why rows are kept
-- only for the current window.
--
-- Access model: the counters live in `private` (no Data API access) with RLS
-- enabled and no policies, as defense in depth; the only way in is the
-- SECURITY DEFINER function below. The visitor is not signed in yet, so the
-- function is executable by anon, which means anyone holding the publishable
-- key can call it with any key. That is acceptable:
-- - it can only spend attempts, never refund them, so it cannot bypass the
--   throttle the app enforces;
-- - locking someone out requires knowing their IP, and lasts one window
--   (Auth keeps its own, separate limits either way);
-- - every call deletes expired windows of every key, so made-up keys cost one
--   row each for at most 15 minutes.
--
-- Error contract (read by the app): SQLSTATE 22023 (invalid_parameter_value)
-- for a client key that is not 64 lowercase hex characters. The app fails
-- open on any error: a throttle outage must not lock the owner out.

create table private.sign_in_attempts (
  client_key text not null check (client_key ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  attempt_count int not null check (attempt_count > 0),
  primary key (client_key, window_start)
);

-- The prune in consume_sign_in_attempt filters on window_start alone.
create index sign_in_attempts_window_start_idx on private.sign_in_attempts (window_start);

comment on table private.sign_in_attempts is
  'Sign-in attempts per client IP digest and 15-minute window. Written only by public.consume_sign_in_attempt.';

alter table private.sign_in_attempts enable row level security;

revoke all on table private.sign_in_attempts from public, anon, authenticated;

create or replace function public.consume_sign_in_attempt(client_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_attempts constant int := 10;
  current_window timestamptz := pg_catalog.date_bin(
    interval '15 minutes', pg_catalog.now(), timestamptz '2000-01-01 00:00:00+00'
  );
begin
  if client_key is null or client_key !~ '^[0-9a-f]{64}$' then
    raise exception 'client key must be 64 lowercase hex characters' using errcode = '22023';
  end if;

  -- Expired windows are never read again. Prune them for every key, not just
  -- this one, so keys that never come back do not accumulate.
  delete from private.sign_in_attempts a
  where a.window_start < current_window;

  -- Atomic take: concurrent calls serialize on the row. A full window is left
  -- untouched (the WHERE skips the update), so no row comes back and a
  -- refused attempt does not count.
  insert into private.sign_in_attempts as a (client_key, window_start, attempt_count)
  values (consume_sign_in_attempt.client_key, current_window, 1)
  on conflict on constraint sign_in_attempts_pkey do update
    set attempt_count = a.attempt_count + 1
    where a.attempt_count < max_attempts;

  return found;
end;
$$;

comment on function public.consume_sign_in_attempt(text) is
  'Takes one sign-in attempt for a client (SHA-256 hex of its IP) in the current 15-minute window; false when its 10 attempts are spent.';

revoke all on function public.consume_sign_in_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_sign_in_attempt(text) to anon, authenticated;
