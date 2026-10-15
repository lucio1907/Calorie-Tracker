-- RLS proof for Settings: public.profiles and public.weight_entries, including
-- the INSERT ... ON CONFLICT DO UPDATE path the Server Actions use (supabase-js
-- upsert with onConflict).
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(17);

-- Fixtures (as postgres, bypassing RLS) -------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-0000000000c1', 'rls-settings-a@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000c2', 'rls-settings-b@local.test', 'authenticated', 'authenticated');

insert into public.profiles (user_id, sex, birth_date, height_cm, activity_level)
values ('00000000-0000-4000-a000-0000000000c2', 'female', '1990-01-01', 160, 'light');

insert into public.weight_entries (user_id, entry_date, kg)
values ('00000000-0000-4000-a000-0000000000c2', '2026-10-15', 60);

-- User A ---------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000c1","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.profiles (user_id, sex, birth_date, height_cm, activity_level, goal, goal_kg_per_week, protein_pct, carbs_pct, fat_pct)
    values ('00000000-0000-4000-a000-0000000000c1', 'male', '1996-01-10', 180, 'moderate', 'lose', 0.5, 30, 40, 30)
    on conflict (user_id) do update set
      sex = excluded.sex, birth_date = excluded.birth_date, height_cm = excluded.height_cm,
      activity_level = excluded.activity_level, goal = excluded.goal, goal_kg_per_week = excluded.goal_kg_per_week,
      protein_pct = excluded.protein_pct, carbs_pct = excluded.carbs_pct, fat_pct = excluded.fat_pct$$,
  'A can create their profile with an upsert'
);

select lives_ok(
  $$insert into public.profiles (user_id, sex, birth_date, height_cm, activity_level, goal, goal_kg_per_week, protein_pct, carbs_pct, fat_pct)
    values ('00000000-0000-4000-a000-0000000000c1', 'male', '1996-01-10', 181.5, 'active', 'gain', 0.25, 35, 40, 25)
    on conflict (user_id) do update set
      sex = excluded.sex, birth_date = excluded.birth_date, height_cm = excluded.height_cm,
      activity_level = excluded.activity_level, goal = excluded.goal, goal_kg_per_week = excluded.goal_kg_per_week,
      protein_pct = excluded.protein_pct, carbs_pct = excluded.carbs_pct, fat_pct = excluded.fat_pct$$,
  'A can update their profile with the same upsert'
);

select results_eq(
  $$select height_cm, activity_level, goal, goal_kg_per_week, protein_pct from public.profiles$$,
  $$values (181.5::numeric(5, 1), 'active'::text, 'gain'::text, 0.25::numeric(3, 2), 35::smallint)$$,
  'A sees only their own profile, with the upserted values'
);

select throws_ok(
  $$insert into public.profiles (user_id, sex) values ('00000000-0000-4000-a000-0000000000c2', 'male')
    on conflict (user_id) do update set sex = excluded.sex$$,
  '42501', null,
  'A cannot upsert B''s profile'
);

select results_eq(
  $$with changed as (update public.profiles set height_cm = 100 where user_id = '00000000-0000-4000-a000-0000000000c2' returning 1)
    select count(*) from changed$$,
  array[0::bigint],
  'A cannot update B''s profile'
);

select throws_ok(
  $$update public.profiles set fat_pct = 20 where user_id = '00000000-0000-4000-a000-0000000000c1'$$,
  '23514', null,
  'a macro split that does not add up to 100 is rejected'
);

select throws_ok(
  $$update public.profiles set goal_kg_per_week = 2 where user_id = '00000000-0000-4000-a000-0000000000c1'$$,
  '23514', null,
  'a weekly rate above 1.5 kg is rejected'
);

select lives_ok(
  $$insert into public.weight_entries (user_id, entry_date, kg)
    values ('00000000-0000-4000-a000-0000000000c1', '2026-10-15', 80.5)
    on conflict (user_id, entry_date) do update set kg = excluded.kg$$,
  'A can log today''s weight with an upsert'
);

select lives_ok(
  $$insert into public.weight_entries (user_id, entry_date, kg)
    values ('00000000-0000-4000-a000-0000000000c1', '2026-10-15', 79.9)
    on conflict (user_id, entry_date) do update set kg = excluded.kg$$,
  'logging again the same day goes through the update path'
);

select results_eq(
  $$select entry_date, kg from public.weight_entries order by entry_date$$,
  $$values ('2026-10-15'::date, 79.9::numeric(5, 2))$$,
  'A has one row for the day, with the latest value, and sees none of B''s'
);

select throws_ok(
  $$insert into public.weight_entries (user_id, entry_date, kg)
    values ('00000000-0000-4000-a000-0000000000c2', '2026-10-16', 70)
    on conflict (user_id, entry_date) do update set kg = excluded.kg$$,
  '42501', null,
  'A cannot log a weight for B'
);

select throws_ok(
  $$insert into public.weight_entries (user_id, entry_date, kg)
    values ('00000000-0000-4000-a000-0000000000c2', '2026-10-15', 70)
    on conflict (user_id, entry_date) do update set kg = excluded.kg$$,
  '42501', null,
  'A cannot overwrite B''s weight for the same day'
);

select throws_ok(
  $$insert into public.weight_entries (entry_date, kg) values ('2026-10-16', 19.99)$$,
  '23514', null,
  'a weight below 20 kg is rejected'
);

-- User B ---------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000c2","role":"authenticated"}', true);

select results_eq(
  'select user_id from public.profiles',
  array['00000000-0000-4000-a000-0000000000c2'::uuid],
  'B sees only their own profile'
);

select results_eq(
  'select kg from public.weight_entries',
  array[60::numeric(5, 2)],
  'B''s weight is untouched and B sees none of A''s'
);

-- Anonymous ------------------------------------------------------------------

set local role anon;

select throws_ok(
  'select * from public.profiles',
  '42501', null,
  'anon cannot read profiles'
);

select throws_ok(
  'select * from public.weight_entries',
  '42501', null,
  'anon cannot read weight entries'
);

select * from finish();

rollback;
