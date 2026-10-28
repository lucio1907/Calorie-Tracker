-- Privilege hygiene (migration privilege_hygiene):
-- - functions that postgres creates from now on are not executable by PUBLIC,
--   so a new function stays closed until a migration grants it explicitly;
-- - signed-in users can update only the profile columns the Settings form
--   writes (its upsert names every payload column in ON CONFLICT DO UPDATE),
--   never the timestamps.
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

-- New functions fail closed --------------------------------------------------

create function public.privilege_probe() returns int language sql as $$ select 1 $$;
create function private.privilege_probe() returns int language sql as $$ select 1 $$;

select ok(
  not has_function_privilege('authenticated', 'public.privilege_probe()', 'execute'),
  'a new public function is not executable by authenticated without a grant'
);
select ok(
  not has_function_privilege('anon', 'public.privilege_probe()', 'execute'),
  'a new public function is not executable by anon without a grant'
);
select ok(
  not has_function_privilege('authenticated', 'private.privilege_probe()', 'execute'),
  'a new private function is not executable by authenticated without a grant'
);
select ok(
  has_function_privilege('authenticated', 'public.search_foods(text, boolean, integer, integer)', 'execute'),
  'functions granted explicitly keep their grants'
);

-- Profile columns ------------------------------------------------------------

insert into auth.users (id, email, aud, role)
values ('00000000-0000-4000-a000-0000000000f1', 'privileges-a@local.test', 'authenticated', 'authenticated');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000f1","role":"authenticated"}', true);

-- The Settings Server Action's upsert (src/features/settings/actions/settings-actions.ts),
-- run twice: the first inserts, the second takes the DO UPDATE path.
select lives_ok(
  $$insert into public.profiles (
      user_id, sex, birth_date, height_cm, activity_level, goal, goal_kg_per_week,
      protein_g_per_kg, carbs_share_pct, fat_share_pct
    )
    values ('00000000-0000-4000-a000-0000000000f1', 'male', '1990-05-10', 180, 'moderate', 'maintain', 0, 1.8, 60, 40)
    on conflict (user_id) do update set
      user_id = excluded.user_id, sex = excluded.sex, birth_date = excluded.birth_date,
      height_cm = excluded.height_cm, activity_level = excluded.activity_level, goal = excluded.goal,
      goal_kg_per_week = excluded.goal_kg_per_week, protein_g_per_kg = excluded.protein_g_per_kg,
      carbs_share_pct = excluded.carbs_share_pct, fat_share_pct = excluded.fat_share_pct$$,
  'the profile upsert creates the row'
);

select lives_ok(
  $$insert into public.profiles (
      user_id, sex, birth_date, height_cm, activity_level, goal, goal_kg_per_week,
      protein_g_per_kg, carbs_share_pct, fat_share_pct
    )
    values ('00000000-0000-4000-a000-0000000000f1', 'female', '1991-06-11', 170, 'light', 'lose', 0.5, 2.0, 50, 50)
    on conflict (user_id) do update set
      user_id = excluded.user_id, sex = excluded.sex, birth_date = excluded.birth_date,
      height_cm = excluded.height_cm, activity_level = excluded.activity_level, goal = excluded.goal,
      goal_kg_per_week = excluded.goal_kg_per_week, protein_g_per_kg = excluded.protein_g_per_kg,
      carbs_share_pct = excluded.carbs_share_pct, fat_share_pct = excluded.fat_share_pct$$,
  'the profile upsert updates every column the form sends'
);

select throws_ok(
  $$update public.profiles set created_at = '2000-01-01' where user_id = '00000000-0000-4000-a000-0000000000f1'$$,
  '42501', null,
  'a signed-in user cannot rewrite created_at'
);

select throws_ok(
  $$update public.profiles set updated_at = '2000-01-01' where user_id = '00000000-0000-4000-a000-0000000000f1'$$,
  '42501', null,
  'a signed-in user cannot rewrite updated_at'
);

select * from finish();

rollback;
