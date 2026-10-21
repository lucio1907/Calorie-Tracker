-- RLS proof for the shared catalogs and the food/recipe side tables:
-- foods and activities with owner_id null are read-only for signed-in users,
-- food_portions follow their food's owner, and food_favorites, recipes and
-- recipe_items are private to their user.
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(37);

-- Fixtures (as postgres, bypassing RLS) -------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-0000000000e1', 'catalog-a@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000e2', 'catalog-b@local.test', 'authenticated', 'authenticated');

insert into public.foods (id, owner_id, source, name, kcal_per_100g)
overriding system value
values
  (910001, null, 'argenfoods', 'Catalog shared food', 100),
  (910002, '00000000-0000-4000-a000-0000000000e1', 'custom', 'Catalog food of A', 200),
  (910003, '00000000-0000-4000-a000-0000000000e2', 'custom', 'Catalog food of B', 300);

insert into public.activities (id, owner_id, name, met, category)
overriding system value
values (910101, null, 'Catalog shared activity', 4.0, 'walking');

insert into public.food_portions (id, food_id, label, grams)
overriding system value
values
  (910201, 910001, 'shared cup', 200),
  (910202, 910002, 'A slice', 25),
  (910203, 910003, 'B slice', 30);

insert into public.food_favorites (user_id, food_id)
values ('00000000-0000-4000-a000-0000000000e2', 910001);

insert into public.recipes (id, user_id, name)
overriding system value
values
  (910301, '00000000-0000-4000-a000-0000000000e1', 'A recipe'),
  (910302, '00000000-0000-4000-a000-0000000000e2', 'B recipe');

insert into public.recipe_items (id, recipe_id, food_id, grams)
overriding system value
values
  (910401, 910301, 910002, 100),
  (910402, 910302, 910003, 100);

-- User A ---------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000e1","role":"authenticated"}', true);

-- Shared catalog: readable, never writable.

select results_eq(
  'select id from public.foods where id between 910001 and 910003 order by id',
  array[910001::bigint, 910002::bigint],
  'A sees the shared food and their own, not B''s'
);

select throws_ok(
  $$insert into public.foods (owner_id, source, name, kcal_per_100g) values (null, 'argenfoods', 'forged shared', 1)$$,
  '42501', null,
  'A cannot add a food to the shared catalog'
);

select results_eq(
  $$with changed as (update public.foods set kcal_per_100g = 1 where id = 910001 returning id) select count(*) from changed$$,
  array[0::bigint],
  'A cannot update a shared food'
);

select results_eq(
  $$with removed as (delete from public.foods where id = 910001 returning id) select count(*) from removed$$,
  array[0::bigint],
  'A cannot delete a shared food'
);

select throws_ok(
  $$update public.foods set owner_id = null where id = 910002$$,
  '42501', null,
  'A cannot move their own food into the shared catalog'
);

select throws_ok(
  $$insert into public.activities (owner_id, name, met, category) values (null, 'forged shared', 3, 'other')$$,
  '42501', null,
  'A cannot add an activity to the shared catalog'
);

select results_eq(
  $$with changed as (update public.activities set met = 30 where id = 910101 returning id) select count(*) from changed$$,
  array[0::bigint],
  'A cannot update a shared activity'
);

select results_eq(
  $$with removed as (delete from public.activities where id = 910101 returning id) select count(*) from removed$$,
  array[0::bigint],
  'A cannot delete a shared activity'
);

-- food_portions: visible with the food, writable only by the food's owner.

select results_eq(
  'select id from public.food_portions where id between 910201 and 910203 order by id',
  array[910201::bigint, 910202::bigint],
  'A sees portions of the shared food and their own, not B''s'
);

select lives_ok(
  $$insert into public.food_portions (food_id, label, grams) values (910002, 'A bowl', 300)$$,
  'A can add a portion to their own food'
);

select throws_ok(
  $$insert into public.food_portions (food_id, label, grams) values (910001, 'forged', 1)$$,
  '42501', null,
  'A cannot add a portion to a shared food'
);

select throws_ok(
  $$insert into public.food_portions (food_id, label, grams) values (910003, 'forged', 1)$$,
  '42501', null,
  'A cannot add a portion to B''s food'
);

select results_eq(
  $$with changed as (update public.food_portions set grams = 1 where id in (910201, 910203) returning id) select count(*) from changed$$,
  array[0::bigint],
  'A cannot update portions of shared or B''s foods'
);

select results_eq(
  $$with removed as (delete from public.food_portions where id in (910201, 910203) returning id) select count(*) from removed$$,
  array[0::bigint],
  'A cannot delete portions of shared or B''s foods'
);

select throws_ok(
  $$update public.food_portions set food_id = 910001 where id = 910202$$,
  '42501', null,
  'A cannot move their portion onto a shared food'
);

-- food_favorites: private to the user, only for visible foods.

select results_eq(
  'select count(*) from public.food_favorites',
  array[0::bigint],
  'A does not see B''s favorites'
);

select lives_ok(
  $$insert into public.food_favorites (food_id) values (910001)$$,
  'A can favorite a shared food (user_id defaults to auth.uid())'
);

select throws_ok(
  $$insert into public.food_favorites (food_id) values (910003)$$,
  '42501', null,
  'A cannot favorite B''s private food'
);

select throws_ok(
  $$insert into public.food_favorites (user_id, food_id) values ('00000000-0000-4000-a000-0000000000e2', 910002)$$,
  '42501', null,
  'A cannot add a favorite for B'
);

select throws_ok(
  $$update public.food_favorites set food_id = 910002$$,
  '42501', null,
  'favorites cannot be updated (no UPDATE grant)'
);

select results_eq(
  $$with removed as (delete from public.food_favorites where user_id = '00000000-0000-4000-a000-0000000000e2' returning food_id) select count(*) from removed$$,
  array[0::bigint],
  'A cannot delete B''s favorites'
);

-- recipes and recipe_items: private to the recipe's user.

select results_eq(
  'select id from public.recipes order by id',
  array[910301::bigint],
  'A sees only their own recipes'
);

select results_eq(
  'select id from public.recipe_items order by id',
  array[910401::bigint],
  'A sees only the items of their own recipes'
);

select throws_ok(
  $$insert into public.recipes (user_id, name) values ('00000000-0000-4000-a000-0000000000e2', 'forged')$$,
  '42501', null,
  'A cannot create a recipe for B'
);

select results_eq(
  $$with changed as (update public.recipes set name = 'renamed' where id = 910302 returning id) select count(*) from changed$$,
  array[0::bigint],
  'A cannot update B''s recipe'
);

select throws_ok(
  $$update public.recipes set user_id = '00000000-0000-4000-a000-0000000000e2' where id = 910301$$,
  '42501', null,
  'A cannot hand their recipe over to B'
);

select results_eq(
  $$with removed as (delete from public.recipes where id = 910302 returning id) select count(*) from removed$$,
  array[0::bigint],
  'A cannot delete B''s recipe'
);

select lives_ok(
  $$insert into public.recipe_items (recipe_id, food_id, grams) values (910301, 910001, 50)$$,
  'A can add a shared food to their own recipe'
);

select throws_ok(
  $$insert into public.recipe_items (recipe_id, food_id, grams) values (910302, 910001, 50)$$,
  '42501', null,
  'A cannot add an item to B''s recipe'
);

select throws_ok(
  $$insert into public.recipe_items (recipe_id, food_id, grams) values (910301, 910003, 50)$$,
  '42501', null,
  'A cannot put B''s private food in their recipe'
);

select throws_ok(
  $$update public.recipe_items set recipe_id = 910302 where id = 910401$$,
  '42501', null,
  'A cannot move their item into B''s recipe'
);

select results_eq(
  $$with changed as (update public.recipe_items set grams = 1 where id = 910402 returning id) select count(*) from changed$$,
  array[0::bigint],
  'A cannot update B''s recipe items'
);

select results_eq(
  $$with removed as (delete from public.recipe_items where id = 910402 returning id) select count(*) from removed$$,
  array[0::bigint],
  'A cannot delete B''s recipe items'
);

-- Anonymous ------------------------------------------------------------------

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok('select * from public.food_favorites', '42501', null, 'anon cannot read favorites');
select throws_ok('select * from public.recipe_items', '42501', null, 'anon cannot read recipe items');

-- Ground truth (as postgres) -------------------------------------------------

reset role;

select results_eq(
  $$select
      (select kcal_per_100g::numeric from public.foods where id = 910001),
      (select met::numeric from public.activities where id = 910101),
      (select string_agg(grams::text, ',' order by id) from public.food_portions where id in (910201, 910203))$$,
  $$values (100::numeric, 4.0::numeric, '200.00,30.00'::text)$$,
  'the shared catalog and B''s portions are untouched'
);

select results_eq(
  $$select
      (select count(*) from public.food_favorites where user_id = '00000000-0000-4000-a000-0000000000e2'),
      (select count(*) from public.recipes where user_id = '00000000-0000-4000-a000-0000000000e2' and name = 'B recipe'),
      (select count(*) from public.recipe_items where recipe_id = 910302 and grams = 100)$$,
  $$values (1::bigint, 1::bigint, 1::bigint)$$,
  'B''s favorite, recipe and item are untouched'
);

select * from finish();
rollback;
