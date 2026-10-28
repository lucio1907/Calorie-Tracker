-- Paging proof for public.search_foods (migration search_foods_pagination):
-- result_offset skips the rows of earlier pages in the same order, the
-- three-argument call keeps working, and RLS still decides which rows exist.
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

-- Signature and grants -------------------------------------------------------

select hasnt_function(
  'public', 'search_foods', array['text', 'boolean', 'integer'],
  'the three-argument signature is replaced, not overloaded'
);
select ok(
  has_function_privilege('authenticated', 'public.search_foods(text, boolean, integer, integer)', 'execute'),
  'authenticated can run the paged search'
);
select ok(
  not has_function_privilege('anon', 'public.search_foods(text, boolean, integer, integer)', 'execute'),
  'anon cannot run the paged search'
);

-- Fixtures (as postgres, bypassing RLS) -------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-0000000000c1', 'paging-a@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000c2', 'paging-b@local.test', 'authenticated', 'authenticated');

-- 25 foods of A named "Zqpag 01" .. "Zqpag 25" (ids 920001 .. 920025) and one of B.
insert into public.foods (id, owner_id, source, name, kcal_per_100g)
overriding system value
select 920000 + n, '00000000-0000-4000-a000-0000000000c1', 'custom', 'Zqpag ' || lpad(n::text, 2, '0'), 100
from generate_series(1, 25) as n;

insert into public.foods (id, owner_id, source, name, kcal_per_100g)
overriding system value
values (920100, '00000000-0000-4000-a000-0000000000c2', 'custom', 'Zqpag of B', 100);

-- User A ---------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000c1","role":"authenticated"}', true);

select results_eq(
  $$select array_agg(id order by ordinality) from public.search_foods('zqpag', false, 20, 0) with ordinality$$,
  $$select array_agg(920000 + n order by n)::bigint[] from generate_series(1, 20) as n$$,
  'the first page holds the first 20 matches'
);

select results_eq(
  $$select array_agg(id order by ordinality) from public.search_foods('zqpag', false, 20, 20) with ordinality$$,
  $$select array_agg(920000 + n order by n)::bigint[] from generate_series(21, 25) as n$$,
  'the second page continues where the first ended'
);

select is(
  (select count(*) from public.search_foods('zqpag', false, 21, 0)),
  21::bigint,
  'asking for one row more than a page tells there is a next page'
);

select is(
  (select count(*) from public.search_foods('zqpag', false, 21, 20)),
  5::bigint,
  'the last page returns fewer rows than a page'
);

select is(
  (select count(*) from public.search_foods('zqpag', false, 20, 25)),
  0::bigint,
  'an offset past the end returns nothing'
);

select results_eq(
  $$select id from public.search_foods('zqpag', false, 30)$$,
  $$select id from public.search_foods('zqpag', false, 30, 0)$$,
  'the three-argument call starts at the first row'
);

select results_eq(
  $$select id from public.search_foods('zqpag', false, 20, -5)$$,
  $$select id from public.search_foods('zqpag', false, 20, 0)$$,
  'a negative offset counts as zero'
);

select is(
  (select count(*) from public.search_foods('zqpag', false, 50, 0) where id = 920100),
  0::bigint,
  'B''s food never shows up on A''s pages'
);

select * from finish();
rollback;
