-- RLS proof for personal food units (migration personal_food_units):
-- a food_portions row with owner_id set is one user's own unit ("unidad" =
-- 25 g) on any food they can see, shared catalog included. It is visible and
-- writable only by that user and can never be handed to someone else.
-- Rows with owner_id null keep the old rule: written only by the food's owner.
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(32);

select has_column('public', 'food_portions', 'owner_id', 'food_portions has an owner_id column');
select has_trigger(
  'public', 'food_portions', 'food_portions_enforce_owner_row_quota',
  'food_portions has a per-user row-quota trigger for personal units'
);

-- Fixtures (as postgres, bypassing RLS) -------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-0000000000f1', 'units-a@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000f2', 'units-b@local.test', 'authenticated', 'authenticated');

insert into public.foods (id, owner_id, source, name, kcal_per_100g)
overriding system value
values
  (930001, null, 'argenfoods', 'Units shared bread', 270),
  (930002, '00000000-0000-4000-a000-0000000000f1', 'custom', 'Units food of A', 200),
  (930003, '00000000-0000-4000-a000-0000000000f2', 'custom', 'Units food of B', 300);

insert into public.food_portions (id, food_id, label, grams)
overriding system value
values
  (930201, 930001, 'shared cup', 200),
  (930202, 930002, 'A slice', 25);

-- User A ---------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000f1","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.food_portions (id, food_id, label, grams, owner_id)
    overriding system value
    values (930301, 930001, 'unidad', 25, '00000000-0000-4000-a000-0000000000f1')$$,
  'A can define a personal unit on a shared catalog food'
);

select results_eq(
  'select id from public.food_portions where food_id = 930001 order by id',
  array[930201::bigint, 930301::bigint],
  'A sees the shared portion and their own unit on the shared food'
);

select throws_ok(
  $$insert into public.food_portions (food_id, label, grams, owner_id)
    values (930001, 'unidad', 30, '00000000-0000-4000-a000-0000000000f1')$$,
  '23505', null,
  'A cannot define the same unit twice on one food'
);

select throws_ok(
  $$insert into public.food_portions (food_id, label, grams) values (930001, 'forged shared', 1)$$,
  '42501', null,
  'A cannot add an owner_id-null portion to a shared food'
);

select results_eq(
  $$with changed as (update public.food_portions set grams = 1 where id = 930201 returning id) select count(*) from changed$$,
  array[0::bigint],
  'A cannot update the shared food''s portion'
);

select results_eq(
  $$with removed as (delete from public.food_portions where id = 930201 returning id) select count(*) from removed$$,
  array[0::bigint],
  'A cannot delete the shared food''s portion'
);

select throws_ok(
  $$update public.food_portions set owner_id = null where id = 930301$$,
  '42501', null,
  'A cannot turn their unit into a shared-food portion'
);

select throws_ok(
  $$insert into public.food_portions (food_id, label, grams, owner_id)
    values (930001, 'forged for B', 1, '00000000-0000-4000-a000-0000000000f2')$$,
  '42501', null,
  'A cannot create a unit owned by B'
);

select throws_ok(
  $$update public.food_portions set owner_id = '00000000-0000-4000-a000-0000000000f2' where id = 930301$$,
  '42501', null,
  'A cannot hand their unit to B'
);

select throws_ok(
  $$insert into public.food_portions (food_id, label, grams, owner_id)
    values (930003, 'unidad', 1, '00000000-0000-4000-a000-0000000000f1')$$,
  '42501', null,
  'A cannot define a unit on B''s private food'
);

select throws_ok(
  $$update public.food_portions set food_id = 930003 where id = 930301$$,
  '42501', null,
  'A cannot move their unit onto B''s private food'
);

select results_eq(
  $$with changed as (update public.food_portions set grams = 26 where id = 930301 returning grams) select grams from changed$$,
  array[26::numeric],
  'A can change the weight of their own unit'
);

-- The food owner's rules for their own food still hold.

select lives_ok(
  $$insert into public.food_portions (food_id, label, grams) values (930002, 'A bowl', 300)$$,
  'A can still add a portion to their own food'
);

select results_eq(
  $$with changed as (update public.food_portions set grams = 30 where id = 930202 returning id) select count(*) from changed$$,
  array[1::bigint],
  'A can still update a portion of their own food'
);

select throws_ok(
  $$insert into public.food_portions (food_id, label, grams) values (930003, 'forged', 1)$$,
  '42501', null,
  'A still cannot add a portion to B''s food'
);

-- User B ---------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000f2","role":"authenticated"}', true);

select results_eq(
  'select id from public.food_portions where food_id = 930001 order by id',
  array[930201::bigint],
  'B sees the shared portion but not A''s unit'
);

select is_empty(
  $$select 1 from public.food_portions where owner_id = '00000000-0000-4000-a000-0000000000f1'$$,
  'B cannot read any of A''s units'
);

select results_eq(
  $$with changed as (update public.food_portions set grams = 1 where id = 930301 returning id) select count(*) from changed$$,
  array[0::bigint],
  'B cannot update A''s unit'
);

select results_eq(
  $$with changed as (update public.food_portions set owner_id = '00000000-0000-4000-a000-0000000000f2' where id = 930301 returning id) select count(*) from changed$$,
  array[0::bigint],
  'B cannot take over A''s unit'
);

select results_eq(
  $$with removed as (delete from public.food_portions where id = 930301 returning id) select count(*) from removed$$,
  array[0::bigint],
  'B cannot delete A''s unit'
);

select throws_ok(
  $$insert into public.food_portions (food_id, label, grams, owner_id)
    values (930001, 'forged for A', 1, '00000000-0000-4000-a000-0000000000f1')$$,
  '42501', null,
  'B cannot create a unit owned by A'
);

select lives_ok(
  $$insert into public.food_portions (id, food_id, label, grams, owner_id)
    overriding system value
    values (930302, 930001, 'unidad', 40, '00000000-0000-4000-a000-0000000000f2')$$,
  'B can define their own "unidad" on the same food as A'
);

select results_eq(
  $$select grams from public.food_portions where food_id = 930001 and label = 'unidad'$$,
  array[40::numeric],
  'B gets their own unit weight, not A''s'
);

select throws_ok(
  $$insert into public.food_portions (food_id, label, grams, owner_id)
    values (930002, 'unidad', 1, '00000000-0000-4000-a000-0000000000f2')$$,
  '42501', null,
  'B cannot define a unit on A''s private food'
);

select results_eq(
  $$with removed as (delete from public.food_portions where id = 930302 returning id) select count(*) from removed$$,
  array[1::bigint],
  'B can delete their own unit'
);

-- Back to A: the unit survived B's attempts.

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000f1","role":"authenticated"}', true);

select results_eq(
  $$select grams, owner_id from public.food_portions where id = 930301$$,
  $$values (26::numeric, '00000000-0000-4000-a000-0000000000f1'::uuid)$$,
  'A''s unit is unchanged by B'
);

-- Per-user quota: at most 2000 personal units ------------------------------

reset role;

insert into public.foods (id, owner_id, source, name, kcal_per_100g)
overriding system value
select 931000 + g, null, 'argenfoods', 'Units quota food ' || g, 100
from generate_series(1, 41) g;

set local role authenticated;

-- A already holds 1 unit (930301); 40 foods x 50 labels minus one = 1999 more.
select lives_ok(
  $$insert into public.food_portions (food_id, label, grams, owner_id)
    select 931000 + f, 'unit ' || l, 10, '00000000-0000-4000-a000-0000000000f1'
    from generate_series(1, 40) f, generate_series(1, 50) l
    where not (f = 40 and l = 50)$$,
  'a user can hold 2000 personal units'
);

select throws_ok(
  $$insert into public.food_portions (food_id, label, grams, owner_id)
    values (931041, 'one too many', 10, '00000000-0000-4000-a000-0000000000f1')$$,
  '23514', 'row_quota:food_portions: at most 2000 rows per owner_id',
  'the 2001st personal unit is rejected'
);

select results_eq(
  $$select count(*) from public.food_portions where owner_id = '00000000-0000-4000-a000-0000000000f1'$$,
  array[2000::bigint],
  'the rejected insert left no row behind'
);

-- B's quota is their own.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000f2","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.food_portions (food_id, label, grams, owner_id)
    values (931041, 'unidad', 10, '00000000-0000-4000-a000-0000000000f2')$$,
  'another user still has room for their own units'
);

select * from finish();
rollback;
