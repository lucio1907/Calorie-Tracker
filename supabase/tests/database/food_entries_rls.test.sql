-- RLS proof for the diary (public.food_entries and its RPCs).
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(23);

-- Fixtures (as postgres, bypassing RLS) -------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-00000000000a', 'rls-a@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-00000000000b', 'rls-b@local.test', 'authenticated', 'authenticated');

insert into public.foods (id, owner_id, source, name, kcal_per_100g)
overriding system value
values
  (900001, null, 'argenfoods', 'RLS shared food', 100),
  (900002, '00000000-0000-4000-a000-00000000000a', 'custom', 'RLS food of A', 200),
  (900003, '00000000-0000-4000-a000-00000000000b', 'custom', 'RLS food of B', 300);

insert into public.food_entries (id, user_id, entry_date, meal, food_id, label, grams, kcal)
overriding system value
values
  (900101, '00000000-0000-4000-a000-00000000000a', '2026-10-14', 'lunch', 900002, 'A lunch', 100, 200),
  (900102, '00000000-0000-4000-a000-00000000000b', '2026-10-14', 'dinner', 900003, 'B dinner', 100, 300);

-- User A ---------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}', true);

select results_eq(
  'select id from public.food_entries order by id',
  array[900101::bigint],
  'A sees only their own entries'
);

select lives_ok(
  $$insert into public.food_entries (entry_date, meal, food_id, label, grams, kcal)
    values ('2026-10-14', 'breakfast', 900001, 'shared', 50, 50)$$,
  'A can log a shared catalog food (user_id defaults to auth.uid())'
);

select lives_ok(
  $$insert into public.food_entries (user_id, entry_date, meal, food_id, label, grams, quantity, portion_label, kcal)
    values ('00000000-0000-4000-a000-00000000000a', '2026-10-14', 'snack', 900002, 'own', 50, 2, '1 slice', 100)$$,
  'A can log their own custom food by portion'
);

select is(
  (select user_id from public.food_entries where label = 'shared'),
  '00000000-0000-4000-a000-00000000000a'::uuid,
  'A''s new entry belongs to A'
);

select throws_ok(
  $$insert into public.food_entries (user_id, entry_date, meal, label, grams, kcal)
    values ('00000000-0000-4000-a000-00000000000b', '2026-10-14', 'lunch', 'forged', 10, 10)$$,
  '42501', null,
  'A cannot insert an entry for B'
);

select throws_ok(
  $$insert into public.food_entries (entry_date, meal, food_id, label, grams, kcal)
    values ('2026-10-14', 'lunch', 900003, 'stolen', 10, 10)$$,
  '42501', null,
  'A cannot log B''s private food'
);

select results_eq(
  $$with changed as (update public.food_entries set meal = 'dinner' where id = 900101 returning id) select count(*) from changed$$,
  array[1::bigint],
  'A can move their own entry to another meal'
);

select throws_ok(
  $$update public.food_entries set food_id = 900003 where id = 900101$$,
  '42501', null,
  'A cannot point their entry at B''s private food'
);

select throws_ok(
  $$update public.food_entries set user_id = '00000000-0000-4000-a000-00000000000b' where id = 900101$$,
  '42501', null,
  'A cannot hand their entry over to B'
);

select results_eq(
  $$with changed as (update public.food_entries set kcal = 0 where id = 900102 returning id) select count(*) from changed$$,
  array[0::bigint],
  'A cannot update B''s entry'
);

select results_eq(
  $$with removed as (delete from public.food_entries where id = 900102 returning id) select count(*) from removed$$,
  array[0::bigint],
  'A cannot delete B''s entry'
);

select results_eq(
  'select id from public.recent_foods(10) order by id',
  array[900001::bigint, 900002::bigint],
  'recent_foods() lists only foods A logged'
);

select results_eq(
  $$with removed as (delete from public.food_entries where id = 900101 returning id) select count(*) from removed$$,
  array[1::bigint],
  'A can delete their own entry'
);

-- User B ---------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000b","role":"authenticated"}', true);

select results_eq(
  'select id from public.food_entries order by id',
  array[900102::bigint],
  'B sees only their own entry (none of A''s)'
);

select results_eq(
  'select count(*) from public.food_entries where user_id = ''00000000-0000-4000-a000-00000000000a''',
  array[0::bigint],
  'filtering by A''s user_id returns nothing for B'
);

select results_eq(
  $$with changed as (update public.food_entries set meal = 'extra' where user_id = '00000000-0000-4000-a000-00000000000a' returning id) select count(*) from changed$$,
  array[0::bigint],
  'B cannot update A''s entries'
);

select results_eq(
  $$with removed as (delete from public.food_entries where user_id = '00000000-0000-4000-a000-00000000000a' returning id) select count(*) from removed$$,
  array[0::bigint],
  'B cannot delete A''s entries'
);

select results_eq(
  'select id from public.recent_foods(10)',
  array[900003::bigint],
  'recent_foods() never shows B the foods A logged'
);

-- Anonymous ------------------------------------------------------------------

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok('select * from public.food_entries', '42501', null, 'anon cannot read entries');

select throws_ok(
  $$insert into public.food_entries (user_id, entry_date, meal, label, grams, kcal)
    values ('00000000-0000-4000-a000-00000000000a', '2026-10-14', 'lunch', 'anon', 10, 10)$$,
  '42501', null,
  'anon cannot write entries'
);

select throws_ok('select * from public.recent_foods(10)', '42501', null, 'anon cannot call recent_foods()');

-- Ground truth (as postgres) -------------------------------------------------

reset role;

select hasnt_function(
  'public', 'copy_food_entries', array['date', 'date', 'text'],
  'copy_food_entries() is gone: no one can multiply their diary rows with it'
);

select results_eq(
  $$select meal, kcal::numeric from public.food_entries where id = 900102$$,
  $$values ('dinner'::text, 300::numeric)$$,
  'B''s entry is untouched by A''s attempts'
);

select * from finish();
rollback;
