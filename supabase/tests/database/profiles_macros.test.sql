-- Macro settings on public.profiles: protein in g per kg of body weight
-- (0.8-3.0, one decimal, default 1.8) and the split of the kcal left after
-- protein between carbs and fat (whole percentages adding up to 100, default
-- 60/40). The old percent-of-target columns are gone.
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(19);

select col_type_is('public', 'profiles', 'protein_g_per_kg', 'numeric(2,1)', 'protein_g_per_kg keeps one decimal');
select col_not_null('public', 'profiles', 'protein_g_per_kg', 'protein_g_per_kg is required');
select col_default_is('public', 'profiles', 'protein_g_per_kg', '1.8', 'protein defaults to 1.8 g/kg');
select col_default_is('public', 'profiles', 'carbs_share_pct', '60', 'carbs default to 60% of the rest');
select col_default_is('public', 'profiles', 'fat_share_pct', '40', 'fat defaults to 40% of the rest');
select hasnt_column('public', 'profiles', 'protein_pct', 'protein_pct is gone');
select hasnt_column('public', 'profiles', 'carbs_pct', 'carbs_pct is gone');
select hasnt_column('public', 'profiles', 'fat_pct', 'fat_pct is gone');

-- Fixtures (as postgres, bypassing RLS) -------------------------------------

insert into auth.users (id, email, aud, role)
values ('00000000-0000-4000-a000-0000000000f1', 'macros@local.test', 'authenticated', 'authenticated');

insert into public.profiles (user_id) values ('00000000-0000-4000-a000-0000000000f1');

select results_eq(
  $$select protein_g_per_kg, carbs_share_pct, fat_share_pct from public.profiles
    where user_id = '00000000-0000-4000-a000-0000000000f1'$$,
  $$values (1.8::numeric(2, 1), 60::smallint, 40::smallint)$$,
  'a new profile gets the default macro settings'
);

-- Protein range ---------------------------------------------------------------

select lives_ok(
  $$update public.profiles set protein_g_per_kg = 0.8 where user_id = '00000000-0000-4000-a000-0000000000f1'$$,
  'protein accepts the 0.8 g/kg lower bound'
);
select lives_ok(
  $$update public.profiles set protein_g_per_kg = 3.0 where user_id = '00000000-0000-4000-a000-0000000000f1'$$,
  'protein accepts the 3.0 g/kg upper bound'
);
select throws_ok(
  $$update public.profiles set protein_g_per_kg = 0.7 where user_id = '00000000-0000-4000-a000-0000000000f1'$$,
  '23514', null,
  'protein below 0.8 g/kg is rejected'
);
select throws_ok(
  $$update public.profiles set protein_g_per_kg = 3.1 where user_id = '00000000-0000-4000-a000-0000000000f1'$$,
  '23514', null,
  'protein above 3.0 g/kg is rejected'
);
select throws_ok(
  $$update public.profiles set protein_g_per_kg = null where user_id = '00000000-0000-4000-a000-0000000000f1'$$,
  '23502', null,
  'protein cannot be null'
);

-- Carbs/fat split -------------------------------------------------------------

select lives_ok(
  $$update public.profiles set carbs_share_pct = 0, fat_share_pct = 100 where user_id = '00000000-0000-4000-a000-0000000000f1'$$,
  'the whole rest can go to one macro'
);
select throws_ok(
  $$update public.profiles set carbs_share_pct = 50, fat_share_pct = 45 where user_id = '00000000-0000-4000-a000-0000000000f1'$$,
  '23514', 'new row for relation "profiles" violates check constraint "profiles_carb_fat_split_total"',
  'a split that does not add up to 100 is rejected'
);
select throws_ok(
  $$update public.profiles set carbs_share_pct = -10, fat_share_pct = 110 where user_id = '00000000-0000-4000-a000-0000000000f1'$$,
  '23514', null,
  'a negative share is rejected even when the total is 100'
);
select throws_ok(
  $$update public.profiles set carbs_share_pct = 101, fat_share_pct = -1 where user_id = '00000000-0000-4000-a000-0000000000f1'$$,
  '23514', null,
  'a share above 100 is rejected even when the total is 100'
);

select results_eq(
  $$select protein_g_per_kg, carbs_share_pct, fat_share_pct from public.profiles
    where user_id = '00000000-0000-4000-a000-0000000000f1'$$,
  $$values (3.0::numeric(2, 1), 0::smallint, 100::smallint)$$,
  'rejected writes leave the last valid settings'
);

select * from finish();

rollback;
