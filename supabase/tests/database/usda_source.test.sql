-- USDA source proof (migration foods_usda_source): the catalog accepts shared
-- rows with source 'usda', search and its source filter return them, users
-- still cannot write shared rows, and unknown sources are still rejected.
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(5);

-- Fixtures (as postgres, bypassing RLS) -------------------------------------

insert into auth.users (id, email, aud, role)
values ('00000000-0000-4000-a000-0000000000e1', 'usda-a@local.test', 'authenticated', 'authenticated');

select lives_ok(
  $$insert into public.foods (id, owner_id, source, external_code, name, food_group, kcal_per_100g)
    overriding system value
    values
      (940001, null, 'usda', '9900001', 'Zqusda pollo, pechuga', 'Aves', 120),
      (940002, null, 'argenfoods', '9900002', 'Zqusda argenfoods', 'Carnes y derivados', 100)$$,
  'a shared usda row is accepted'
);

select throws_ok(
  $$insert into public.foods (owner_id, source, name, kcal_per_100g) values (null, 'nutritionix', 'Zqusda unknown', 1)$$,
  '23514',
  null,
  'an unknown source is still rejected'
);

-- User A ---------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000e1","role":"authenticated"}', true);

select results_eq(
  $$select array_agg(id order by id) from public.search_foods('zqusda', false, 50, 0, 'usda')$$,
  $$values (array[940001]::bigint[])$$,
  'the usda filter keeps only USDA foods'
);
select results_eq(
  $$select array_agg(id order by id) from public.search_foods('zqusda', false, 50, 0, null)$$,
  $$values (array[940001, 940002]::bigint[])$$,
  'search without a filter lists USDA foods next to the rest of the catalog'
);
select throws_ok(
  $$insert into public.foods (owner_id, source, name, kcal_per_100g) values (null, 'usda', 'Zqusda forged', 1)$$,
  '42501',
  null,
  'a user cannot write a shared usda row'
);

select * from finish();
rollback;
