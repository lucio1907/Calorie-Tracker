-- Atomic recipe save (migration save_recipe):
-- - public.save_recipe() creates or updates a recipe and replaces its
--   ingredients in one statement: any failing ingredient rolls back the
--   whole save, including the recipe's own fields;
-- - it runs as the caller (SECURITY INVOKER), so RLS (owner, visible foods,
--   aal2) and the row quotas still apply;
-- - bad input is rejected with 22023, someone else's recipe with P0002.
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(30);

-- Structure ------------------------------------------------------------------

select ok(
  not (select prosecdef from pg_proc where oid = 'public.save_recipe(text, numeric, jsonb, text, bigint)'::regprocedure),
  'save_recipe is SECURITY INVOKER'
);

select is(
  (select proconfig from pg_proc where oid = 'public.save_recipe(text, numeric, jsonb, text, bigint)'::regprocedure),
  array['search_path=""'],
  'save_recipe pins an empty search_path'
);

select ok(
  not has_function_privilege('anon', 'public.save_recipe(text, numeric, jsonb, text, bigint)', 'execute')
    and has_function_privilege('authenticated', 'public.save_recipe(text, numeric, jsonb, text, bigint)', 'execute'),
  'save_recipe is executable by authenticated only'
);

-- Fixtures (as postgres, bypassing RLS) -------------------------------------
-- A: the caller. B: another user. M: a user with a verified TOTP factor.

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-0000000000d1', 'save-recipe-a@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000d2', 'save-recipe-b@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000d3', 'save-recipe-m@local.test', 'authenticated', 'authenticated');

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values ('00000000-0000-4000-a000-0000000000d4', '00000000-0000-4000-a000-0000000000d3', '', 'totp', 'verified', now(), now());

insert into public.foods (id, owner_id, source, name, kcal_per_100g)
overriding system value
values
  (930001, null, 'argenfoods', 'Save recipe shared rice', 130),
  (930002, '00000000-0000-4000-a000-0000000000d1', 'custom', 'Save recipe food of A', 165),
  (930003, '00000000-0000-4000-a000-0000000000d2', 'custom', 'Save recipe food of B', 200);

insert into public.recipes (id, user_id, name)
overriding system value
values (930301, '00000000-0000-4000-a000-0000000000d2', 'B recipe');

insert into public.recipe_items (recipe_id, food_id, grams)
values (930301, 930003, 100);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d1","role":"authenticated"}', true);

-- Create -------------------------------------------------------------------------

select set_config(
  'test.recipe_id',
  public.save_recipe(
    name => 'Rice bowl',
    servings => 2,
    notes => 'Cook the rice first',
    ingredients => '[{"food_id": 930001, "grams": 300}, {"food_id": 930002, "grams": 200.5}]'
  )::text,
  true
);

select results_eq(
  $$select user_id, name, servings, notes from public.recipes where id = current_setting('test.recipe_id')::bigint$$,
  $$values ('00000000-0000-4000-a000-0000000000d1'::uuid, 'Rice bowl'::text, 2.00::numeric, 'Cook the rice first'::text)$$,
  'create stores the recipe for the caller'
);

select results_eq(
  $$select food_id, grams, position::int from public.recipe_items
    where recipe_id = current_setting('test.recipe_id')::bigint order by position$$,
  $$values (930001::bigint, 300.00::numeric, 0), (930002::bigint, 200.50::numeric, 1)$$,
  'create stores the ingredients with positions from the array order'
);

select lives_ok(
  $$select public.save_recipe(name => 'Empty', servings => 1, ingredients => '[]')$$,
  'a recipe without ingredients can be saved'
);

-- Update -------------------------------------------------------------------------

select is(
  public.save_recipe(
    recipe_id => current_setting('test.recipe_id')::bigint,
    name => 'Chicken bowl',
    servings => 3,
    ingredients => '[{"food_id": 930002, "grams": 250}]'
  ),
  current_setting('test.recipe_id')::bigint,
  'update returns the recipe id'
);

select results_eq(
  $$select name, servings, notes from public.recipes where id = current_setting('test.recipe_id')::bigint$$,
  $$values ('Chicken bowl'::text, 3.00::numeric, null::text)$$,
  'update replaces name, servings and notes'
);

select results_eq(
  $$select food_id, grams, position::int from public.recipe_items where recipe_id = current_setting('test.recipe_id')::bigint$$,
  $$values (930002::bigint, 250.00::numeric, 0)$$,
  'update replaces the ingredients'
);

-- A failing ingredient rolls back the whole save ---------------------------------

select throws_ok(
  $$select public.save_recipe(
      recipe_id => current_setting('test.recipe_id')::bigint,
      name => 'Renamed',
      servings => 5,
      ingredients => '[{"food_id": 930001, "grams": 100}, {"food_id": 930003, "grams": 100}]'
    )$$,
  '42501', 'new row violates row-level security policy for table "recipe_items"',
  'an ingredient whose food the caller cannot see is rejected'
);

select results_eq(
  $$select r.name, r.servings, count(i.id)::int, min(i.food_id)
    from public.recipes r join public.recipe_items i on i.recipe_id = r.id
    where r.id = current_setting('test.recipe_id')::bigint
    group by r.name, r.servings$$,
  $$values ('Chicken bowl'::text, 3.00::numeric, 1, 930002::bigint)$$,
  'the failed update changed neither the recipe nor its ingredients'
);

select throws_ok(
  $$select public.save_recipe(name => 'Sneaky', servings => 1, ingredients => '[{"food_id": 930003, "grams": 100}]')$$,
  '42501', 'new row violates row-level security policy for table "recipe_items"',
  'a create with a hidden food is rejected'
);

select is(
  (select count(*) from public.recipes where name = 'Sneaky'),
  0::bigint,
  'the failed create left no recipe behind'
);

-- Someone else's recipe ----------------------------------------------------------

select throws_ok(
  $$select public.save_recipe(recipe_id => 930301, name => 'Taken over', servings => 1, ingredients => '[]')$$,
  'P0002', 'recipe 930301 not found',
  'another user''s recipe cannot be updated'
);

select throws_ok(
  $$select public.save_recipe(recipe_id => 999999999, name => 'Ghost', servings => 1, ingredients => '[]')$$,
  'P0002', 'recipe 999999999 not found',
  'a missing recipe id fails instead of creating one'
);

-- Input validation ---------------------------------------------------------------

select throws_ok(
  $$select public.save_recipe(name => '', servings => 1, ingredients => '[]')$$,
  '22023', 'name must have 1 to 200 characters', 'an empty name is rejected'
);

select throws_ok(
  $$select public.save_recipe(name => 'Bowl', servings => 0, ingredients => '[]')$$,
  '22023', 'servings must be greater than 0 and at most 999', 'zero servings are rejected'
);

select throws_ok(
  $$select public.save_recipe(name => 'Bowl', servings => 0.004, ingredients => '[]')$$,
  '22023', 'servings must be greater than 0 and at most 999', 'servings that round to 0 are rejected'
);

select throws_ok(
  $$select public.save_recipe(name => 'Bowl', servings => 1000, ingredients => '[]')$$,
  '22023', 'servings must be greater than 0 and at most 999', 'more than 999 servings are rejected'
);

select throws_ok(
  $$select public.save_recipe(name => 'Bowl', servings => 1, notes => repeat('x', 2001), ingredients => '[]')$$,
  '22023', 'notes must have at most 2000 characters', 'notes over 2000 characters are rejected'
);

select throws_ok(
  $$select public.save_recipe(name => 'Bowl', servings => 1, ingredients => '{"food_id": 930001}')$$,
  '22023', 'ingredients must be a JSON array', 'ingredients that are not an array are rejected'
);

select throws_ok(
  $$select public.save_recipe(
      name => 'Bowl', servings => 1,
      ingredients => (select jsonb_agg(jsonb_build_object('food_id', 930001, 'grams', 1)) from generate_series(1, 101))
    )$$,
  '22023', 'a recipe has at most 100 ingredients', 'more than 100 ingredients are rejected'
);

select throws_ok(
  $$select public.save_recipe(name => 'Bowl', servings => 1, ingredients => '[{"food_id": 930001, "grams": 0}]')$$,
  '22023', null, 'zero grams are rejected'
);

select throws_ok(
  $$select public.save_recipe(name => 'Bowl', servings => 1, ingredients => '[{"food_id": 930001, "grams": 10000.01}]')$$,
  '22023', null, 'more than 10000 grams are rejected'
);

select throws_ok(
  $$select public.save_recipe(name => 'Bowl', servings => 1, ingredients => '[{"food_id": "930001", "grams": 10}]')$$,
  '22023', null, 'a food_id that is not a JSON number is rejected'
);

select throws_ok(
  $$select public.save_recipe(name => 'Bowl', servings => 1, ingredients => '[{"food_id": 1.5, "grams": 10}]')$$,
  '22023', null, 'a food_id that is not a positive integer is rejected'
);

-- Row quota ----------------------------------------------------------------------

reset role;
-- A already holds 2 recipes ("Chicken bowl", "Empty"); fill up to the cap of 500.
insert into public.recipes (user_id, name)
select '00000000-0000-4000-a000-0000000000d1', 'filler ' || g from generate_series(1, 498) g;
set local role authenticated;

select throws_ok(
  $$select public.save_recipe(name => 'One too many', servings => 1, ingredients => '[]')$$,
  '23514', 'row_quota:recipes: at most 500 rows per user_id',
  'the recipes row quota still applies'
);

-- MFA user: aal1 is refused, aal2 works ------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d3","role":"authenticated","aal":"aal1"}', true);

select throws_ok(
  $$select public.save_recipe(name => 'Aal1 recipe', servings => 1, ingredients => '[]')$$,
  '42501', 'new row violates row-level security policy "recipes: aal2 when MFA is enabled" for table "recipes"',
  'an aal1 session of an MFA user cannot save a recipe'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d3","role":"authenticated","aal":"aal2"}', true);

select lives_ok(
  $$select public.save_recipe(name => 'Aal2 recipe', servings => 1, ingredients => '[{"food_id": 930001, "grams": 100}]')$$,
  'an aal2 session of an MFA user can save a recipe'
);

-- anon ---------------------------------------------------------------------------

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$select public.save_recipe(name => 'Anon recipe', servings => 1, ingredients => '[]')$$,
  '42501', 'permission denied for function save_recipe',
  'anon cannot execute save_recipe'
);

select * from finish();
rollback;
