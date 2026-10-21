-- Open Food Facts throttle and barcode miss cache (migration off_request_throttle):
-- - the counter and miss tables are unreachable for anon and signed-in users,
--   so nobody can reset their own counters; access goes through the
--   SECURITY DEFINER functions, which anon cannot execute;
-- - consume_off_request allows 7 product and 5 search requests per user and
--   minute, refuses past that and starts over in the next window;
-- - the miss cache is per user and expires after 24 hours.
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(34);

-- Privileges ------------------------------------------------------------------

select ok(
  (select relrowsecurity from pg_class where oid = 'private.off_request_counters'::regclass),
  'off_request_counters has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.off_barcode_misses'::regclass),
  'off_barcode_misses has RLS enabled'
);

select ok(
  not has_function_privilege('anon', 'public.consume_off_request(text)', 'execute'),
  'anon cannot execute consume_off_request'
);
select ok(
  not has_function_privilege('anon', 'public.off_barcode_recently_missed(text)', 'execute'),
  'anon cannot execute off_barcode_recently_missed'
);
select ok(
  not has_function_privilege('anon', 'public.record_off_barcode_miss(text)', 'execute'),
  'anon cannot execute record_off_barcode_miss'
);
select ok(
  has_function_privilege('authenticated', 'public.consume_off_request(text)', 'execute')
    and has_function_privilege('authenticated', 'public.off_barcode_recently_missed(text)', 'execute')
    and has_function_privilege('authenticated', 'public.record_off_barcode_miss(text)', 'execute'),
  'authenticated can execute the three functions'
);

-- Fixtures (as postgres, bypassing RLS) -------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-0000000000d1', 'off-a@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000d2', 'off-b@local.test', 'authenticated', 'authenticated');

-- Anon ------------------------------------------------------------------------

set local role anon;

select throws_ok(
  $$select public.consume_off_request('search')$$,
  '42501', null,
  'anon cannot take a request slot'
);

reset role;

-- No signed-in user -----------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);

select throws_ok(
  $$select public.consume_off_request('search')$$,
  '42501', 'not signed in',
  'consume_off_request requires a signed-in user'
);
select throws_ok(
  $$select public.record_off_barcode_miss('7790000000001')$$,
  '42501', 'not signed in',
  'record_off_barcode_miss requires a signed-in user'
);

-- User A: the tables are not reachable directly -------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d1","role":"authenticated"}', true);

select throws_ok(
  $$select * from private.off_request_counters$$,
  '42501', null,
  'a signed-in user cannot read the counters'
);
select throws_ok(
  $$insert into private.off_request_counters (user_id, kind, window_start, request_count)
    values ('00000000-0000-4000-a000-0000000000d1', 'search', now(), 1)$$,
  '42501', null,
  'a signed-in user cannot insert counters'
);
select throws_ok(
  $$update private.off_request_counters set request_count = 1$$,
  '42501', null,
  'a signed-in user cannot reset the counters'
);
select throws_ok(
  $$delete from private.off_request_counters$$,
  '42501', null,
  'a signed-in user cannot delete the counters'
);
select throws_ok(
  $$select * from private.off_barcode_misses$$,
  '42501', null,
  'a signed-in user cannot read the miss cache'
);
select throws_ok(
  $$insert into private.off_barcode_misses (user_id, barcode)
    values ('00000000-0000-4000-a000-0000000000d1', '7790000000001')$$,
  '42501', null,
  'a signed-in user cannot insert misses'
);
select throws_ok(
  $$update private.off_barcode_misses set checked_at = now()$$,
  '42501', null,
  'a signed-in user cannot update misses'
);
select throws_ok(
  $$delete from private.off_barcode_misses$$,
  '42501', null,
  'a signed-in user cannot delete misses'
);

-- User A: limits ----------------------------------------------------------------

select throws_ok(
  $$select public.consume_off_request('facets')$$,
  '22023', 'unknown request kind: facets',
  'an unknown request kind is rejected'
);

select is(
  (select array_agg(public.consume_off_request('search')) from generate_series(1, 6)),
  array[true, true, true, true, true, false],
  'search allows 5 requests per minute and refuses the 6th'
);
select is(
  public.consume_off_request('search'),
  false,
  'search stays refused for the rest of the window'
);
select is(
  (select array_agg(public.consume_off_request('product')) from generate_series(1, 8)),
  array[true, true, true, true, true, true, true, false],
  'product has its own limit of 7 requests per minute'
);

-- User B: isolated from A -------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d2","role":"authenticated"}', true);

select is(public.consume_off_request('search'), true, 'another user still has search slots');

-- A new window (moved back as postgres) -----------------------------------------

reset role;

select is(
  (select max(request_count) from private.off_request_counters
   where user_id = '00000000-0000-4000-a000-0000000000d1' and kind = 'search'),
  5,
  'a refused request does not grow the counter past the limit'
);

update private.off_request_counters
set window_start = window_start - interval '1 minute'
where user_id = '00000000-0000-4000-a000-0000000000d1';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d1","role":"authenticated"}', true);

select is(public.consume_off_request('search'), true, 'the limit starts over in a new window');

reset role;

select results_eq(
  $$select kind, request_count from private.off_request_counters
    where user_id = '00000000-0000-4000-a000-0000000000d1' order by kind$$,
  $$values ('search'::text, 1)$$,
  'expired windows of the caller are deleted'
);
select is(
  (select count(*)::int from private.off_request_counters where user_id = '00000000-0000-4000-a000-0000000000d2'),
  1,
  'other users'' windows are left alone'
);

-- Miss cache --------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d1","role":"authenticated"}', true);

select throws_ok(
  $$select public.off_barcode_recently_missed('12ab')$$,
  '22023', 'barcode must be 8 to 14 digits',
  'off_barcode_recently_missed rejects an invalid barcode'
);
select throws_ok(
  $$select public.record_off_barcode_miss('123')$$,
  '22023', 'barcode must be 8 to 14 digits',
  'record_off_barcode_miss rejects an invalid barcode'
);

select is(public.off_barcode_recently_missed('7790000000001'), false, 'an unchecked barcode is not a miss');

select lives_ok(
  $$select public.record_off_barcode_miss('7790000000001')$$,
  'a miss can be recorded'
);
select is(public.off_barcode_recently_missed('7790000000001'), true, 'a recorded miss is remembered');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d2","role":"authenticated"}', true);

select is(public.off_barcode_recently_missed('7790000000001'), false, 'misses are per user');

-- Age A's miss past the TTL (as postgres).
reset role;
update private.off_barcode_misses
set checked_at = now() - interval '25 hours'
where user_id = '00000000-0000-4000-a000-0000000000d1';

-- A's cache holds 500 older (still fresh) misses besides the expired one.
insert into private.off_barcode_misses (user_id, barcode, checked_at)
select '00000000-0000-4000-a000-0000000000d1', (77910000000 + g)::text, now() - interval '1 hour' - g * interval '1 second'
from generate_series(1, 500) g;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d1","role":"authenticated"}', true);

select is(public.off_barcode_recently_missed('7790000000001'), false, 'a miss expires after 24 hours');

do $$ begin perform public.record_off_barcode_miss('7790000000002'); end $$;

reset role;

select results_eq(
  $$select count(*)::int,
      count(*) filter (where barcode = '7790000000001')::int,
      count(*) filter (where barcode = '7790000000002')::int,
      count(*) filter (where barcode = (77910000000 + 500)::text)::int
    from private.off_barcode_misses
    where user_id = '00000000-0000-4000-a000-0000000000d1'$$,
  $$values (500, 0, 1, 0)$$,
  'recording prunes expired misses and keeps only the newest 500'
);

select * from finish();

rollback;
