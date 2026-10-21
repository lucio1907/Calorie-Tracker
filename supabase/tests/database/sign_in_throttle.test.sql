-- Sign-in throttle (migration sign_in_throttle):
-- - the attempts table is unreachable for anon and signed-in users, so nobody
--   can reset a counter; access goes through the SECURITY DEFINER function,
--   which anon CAN execute (visitors are not signed in yet);
-- - consume_sign_in_attempt allows 10 attempts per client key and 15-minute
--   window, refuses past that without counting and starts over in the next
--   window;
-- - every call prunes expired windows of every key.
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

-- Two client keys (the app sends SHA-256 hex digests of client IPs).
create temporary table keys (name text primary key, client_key text not null) on commit drop;
insert into keys values
  ('a', encode(sha256('203.0.113.10'::bytea), 'hex')),
  ('b', encode(sha256('203.0.113.20'::bytea), 'hex')),
  ('stale', encode(sha256('203.0.113.30'::bytea), 'hex'));
grant select on keys to anon, authenticated;

-- Start from an empty table: local sign-ins may have left current windows.
delete from private.sign_in_attempts;

-- Privileges ------------------------------------------------------------------

select ok(
  (select relrowsecurity from pg_class where oid = 'private.sign_in_attempts'::regclass),
  'sign_in_attempts has RLS enabled'
);
select ok(
  has_function_privilege('anon', 'public.consume_sign_in_attempt(text)', 'execute')
    and has_function_privilege('authenticated', 'public.consume_sign_in_attempt(text)', 'execute'),
  'anon and authenticated can execute consume_sign_in_attempt'
);

-- The table is not reachable directly ----------------------------------------

set local role anon;

select throws_ok(
  $$select * from private.sign_in_attempts$$,
  '42501', null,
  'anon cannot read the attempts'
);
select throws_ok(
  $$insert into private.sign_in_attempts (client_key, window_start, attempt_count)
    values ((select client_key from keys where name = 'a'), now(), 1)$$,
  '42501', null,
  'anon cannot insert attempts'
);
select throws_ok(
  $$update private.sign_in_attempts set attempt_count = 1$$,
  '42501', null,
  'anon cannot reset the attempts'
);
select throws_ok(
  $$delete from private.sign_in_attempts$$,
  '42501', null,
  'anon cannot delete the attempts'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000e1","role":"authenticated"}', true);

select throws_ok(
  $$select * from private.sign_in_attempts$$,
  '42501', null,
  'a signed-in user cannot read the attempts'
);
select throws_ok(
  $$insert into private.sign_in_attempts (client_key, window_start, attempt_count)
    values ((select client_key from keys where name = 'a'), now(), 1)$$,
  '42501', null,
  'a signed-in user cannot insert attempts'
);
select throws_ok(
  $$update private.sign_in_attempts set attempt_count = 1$$,
  '42501', null,
  'a signed-in user cannot reset the attempts'
);
select throws_ok(
  $$delete from private.sign_in_attempts$$,
  '42501', null,
  'a signed-in user cannot delete the attempts'
);

reset role;

-- Limits (as anon, like the login form) ---------------------------------------

set local role anon;

select throws_ok(
  $$select public.consume_sign_in_attempt('203.0.113.10')$$,
  '22023', 'client key must be 64 lowercase hex characters',
  'a raw IP is rejected as a client key'
);
select throws_ok(
  $$select public.consume_sign_in_attempt(upper((select client_key from keys where name = 'a')))$$,
  '22023', 'client key must be 64 lowercase hex characters',
  'an uppercase digest is rejected'
);

select is(
  (select array_agg(public.consume_sign_in_attempt((select client_key from keys where name = 'a')))
   from generate_series(1, 11)),
  array[true, true, true, true, true, true, true, true, true, true, false],
  'a client gets 10 attempts per window and the 11th is refused'
);
select is(
  public.consume_sign_in_attempt((select client_key from keys where name = 'b')),
  true,
  'another client key is isolated from the first'
);

reset role;

select is(
  (select attempt_count from private.sign_in_attempts
   where client_key = (select client_key from keys where name = 'a')),
  10,
  'a refused attempt does not grow the counter past the limit'
);

-- A new window (moved back as postgres) ---------------------------------------

update private.sign_in_attempts
set window_start = window_start - interval '15 minutes'
where client_key = (select client_key from keys where name = 'a');

-- An expired window of a key that never comes back.
insert into private.sign_in_attempts (client_key, window_start, attempt_count)
values ((select client_key from keys where name = 'stale'), now() - interval '1 hour', 3);

set local role anon;

select is(
  public.consume_sign_in_attempt((select client_key from keys where name = 'a')),
  true,
  'the limit starts over in a new window'
);

reset role;

select results_eq(
  $$select k.name, s.attempt_count
    from private.sign_in_attempts s join keys k using (client_key)
    order by k.name$$,
  $$values ('a'::text, 1), ('b'::text, 1)$$,
  'expired windows are pruned for every key, current ones are kept'
);
select is(
  (select count(*)::int from private.sign_in_attempts),
  2,
  'only current windows remain'
);

select * from finish();

rollback;
