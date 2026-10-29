-- Source filter proof for public.search_foods (migration search_foods_source_filter):
-- source_filter keeps only foods of one source, combines with favorites_only
-- and the text query, the four-argument call keeps working, and RLS still
-- decides which rows exist.
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

-- Signature and grants -------------------------------------------------------

select hasnt_function(
  'public', 'search_foods', array['text', 'boolean', 'integer', 'integer'],
  'the four-argument signature is replaced, not overloaded'
);
select ok(
  has_function_privilege('authenticated', 'public.search_foods(text, boolean, integer, integer, text)', 'execute'),
  'authenticated can run the filtered search'
);
select ok(
  not has_function_privilege('anon', 'public.search_foods(text, boolean, integer, integer, text)', 'execute'),
  'anon cannot run the filtered search'
);

-- Fixtures (as postgres, bypassing RLS) -------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-0000000000d1', 'source-a@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000d2', 'source-b@local.test', 'authenticated', 'authenticated');

-- A owns a custom food and an Open Food Facts import; the shared catalog has an
-- ARGENFOODS row; B owns a custom food A must never see.
insert into public.foods (id, owner_id, source, name, kcal_per_100g)
overriding system value
values
  (930001, '00000000-0000-4000-a000-0000000000d1', 'custom', 'Zqsrc custom', 100),
  (930002, '00000000-0000-4000-a000-0000000000d1', 'off', 'Zqsrc off', 100),
  (930003, null, 'argenfoods', 'Zqsrc argenfoods', 100),
  (930004, '00000000-0000-4000-a000-0000000000d2', 'custom', 'Zqsrc custom of B', 100);

insert into public.food_favorites (user_id, food_id)
values ('00000000-0000-4000-a000-0000000000d1', 930003);

-- User A ---------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d1","role":"authenticated"}', true);

select results_eq(
  $$select array_agg(id order by id) from public.search_foods('zqsrc', false, 50, 0, 'custom')$$,
  $$values (array[930001]::bigint[])$$,
  'custom keeps only the caller''s own created foods (not Open Food Facts imports, not other users'')'
);
select results_eq(
  $$select array_agg(id order by id) from public.search_foods('zqsrc', false, 50, 0, 'off')$$,
  $$values (array[930002]::bigint[])$$,
  'off keeps only Open Food Facts foods'
);
select results_eq(
  $$select array_agg(id order by id) from public.search_foods('zqsrc', false, 50, 0, 'argenfoods')$$,
  $$values (array[930003]::bigint[])$$,
  'argenfoods keeps only catalog foods'
);
select results_eq(
  $$select array_agg(id order by id) from public.search_foods('zqsrc', false, 50, 0, null)$$,
  $$values (array[930001, 930002, 930003]::bigint[])$$,
  'no filter lists every visible source'
);
select results_eq(
  $$select array_agg(id order by id) from public.search_foods('zqsrc', true, 50, 0, 'custom')$$,
  $$values (null::bigint[])$$,
  'favorites_only and source_filter combine'
);
select results_eq(
  $$select array_agg(id order by id) from public.search_foods('zqsrc', false, 50)$$,
  $$values (array[930001, 930002, 930003]::bigint[])$$,
  'a call without source_filter still searches every source'
);

select * from finish();
rollback;
