-- Profile history: public.profile_versions is written only by the triggers on
-- public.profiles (one row per user per Buenos Aires calendar day, several
-- edits on a day collapse into one), readable only by its owner, and
-- private.backfill_profile_versions() gives older profiles their first
-- version. now() is the transaction start, so the triggers and these
-- expressions agree on "today".
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(28);

select has_table('public', 'profile_versions', 'profile_versions exists');
select has_trigger('public', 'profiles', 'profiles_record_version_on_insert', 'profiles has the insert version trigger');
select has_trigger('public', 'profiles', 'profiles_record_version_on_update', 'profiles has the update version trigger');
select is(
  (select relrowsecurity from pg_class where oid = 'public.profile_versions'::regclass),
  true,
  'RLS is enabled on profile_versions'
);
select col_is_pk('public', 'profile_versions', array['user_id', 'effective_date'], 'one version per user per day');
select col_type_is('public', 'profile_versions', 'protein_g_per_kg', 'numeric(2,1)', 'versions keep the protein setting');
select columns_are(
  'public', 'profile_versions',
  array[
    'user_id', 'effective_date', 'sex', 'birth_date', 'height_cm', 'activity_level', 'goal', 'goal_kg_per_week',
    'protein_g_per_kg', 'carbs_share_pct', 'fat_share_pct', 'created_at'
  ],
  'versions snapshot the new macro columns and no longer the old percentages'
);

-- Fixtures (as postgres, bypassing RLS) -------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-0000000000e1', 'versions-a@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000e2', 'versions-b@local.test', 'authenticated', 'authenticated');

-- Backfill: B's profile predates the history table ---------------------------

insert into public.profiles (
  user_id, sex, birth_date, height_cm, activity_level, goal, goal_kg_per_week,
  protein_g_per_kg, carbs_share_pct, fat_share_pct, created_at
)
values (
  '00000000-0000-4000-a000-0000000000e2', 'female', '1988-02-03', 165, 'light', 'lose', 0.25,
  2.0, 55, 45, '2026-10-10 12:00:00+00'
);

insert into public.food_entries (user_id, entry_date, meal, label, grams, kcal)
values ('00000000-0000-4000-a000-0000000000e2', '2026-09-25', 'lunch', 'B lunch', 100, 500);
insert into public.weight_entries (user_id, entry_date, kg)
values ('00000000-0000-4000-a000-0000000000e2', '2026-09-20', 62);
insert into public.activity_entries (user_id, entry_date, label, minutes, kcal)
values ('00000000-0000-4000-a000-0000000000e2', '2026-10-01', 'B walk', 30, 120);

-- Simulate a profile written before the migration: no history yet.
delete from public.profile_versions where user_id = '00000000-0000-4000-a000-0000000000e2';

select is(private.backfill_profile_versions(), 1, 'the backfill adds one version per profile without history');

select results_eq(
  $$select effective_date, sex, birth_date, height_cm, activity_level, goal, goal_kg_per_week,
      protein_g_per_kg, carbs_share_pct, fat_share_pct
    from public.profile_versions where user_id = '00000000-0000-4000-a000-0000000000e2'$$,
  $$values ('2026-09-20'::date, 'female'::text, '1988-02-03'::date, 165::numeric(5, 1), 'light'::text, 'lose'::text,
      0.25::numeric(3, 2), 2.0::numeric(2, 1), 55::smallint, 45::smallint)$$,
  'the backfilled version holds the current values from the earliest data day'
);

select is(private.backfill_profile_versions(), 0, 'rerunning the backfill adds nothing');

-- User A: the triggers keep the history --------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000e1","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.profiles (user_id, sex, birth_date, height_cm, activity_level, goal, goal_kg_per_week)
    values ('00000000-0000-4000-a000-0000000000e1', 'male', '1990-05-10', 180, 'moderate', 'maintain', 0)
    on conflict (user_id) do update set goal = excluded.goal, goal_kg_per_week = excluded.goal_kg_per_week$$,
  'A creates their profile with the Settings upsert'
);

select results_eq(
  $$select effective_date, goal, goal_kg_per_week from public.profile_versions$$,
  $$values ((now() at time zone 'America/Argentina/Buenos_Aires')::date, 'maintain'::text, 0::numeric(3, 2))$$,
  'creating a profile records today''s version (and A sees only their own)'
);

select lives_ok(
  $$insert into public.profiles (user_id, sex, birth_date, height_cm, activity_level, goal, goal_kg_per_week)
    values ('00000000-0000-4000-a000-0000000000e1', 'male', '1990-05-10', 180, 'moderate', 'lose', 0.5)
    on conflict (user_id) do update set goal = excluded.goal, goal_kg_per_week = excluded.goal_kg_per_week$$,
  'A changes the goal with the same upsert'
);

select results_eq(
  $$select effective_date, goal, goal_kg_per_week from public.profile_versions$$,
  $$values ((now() at time zone 'America/Argentina/Buenos_Aires')::date, 'lose'::text, 0.50::numeric(3, 2))$$,
  'a second edit on the same day collapses into today''s version'
);

-- Age the version as if it had been written a month ago.
reset role;
update public.profile_versions
set effective_date = (now() at time zone 'America/Argentina/Buenos_Aires')::date - 30
where user_id = '00000000-0000-4000-a000-0000000000e1';
set local role authenticated;

update public.profiles set goal = 'lose', height_cm = 180 where user_id = '00000000-0000-4000-a000-0000000000e1';

select results_eq(
  $$select count(*) from public.profile_versions$$,
  array[1::bigint],
  'saving unchanged values records no new version'
);

update public.profiles set goal = 'gain', goal_kg_per_week = 0.25 where user_id = '00000000-0000-4000-a000-0000000000e1';

select results_eq(
  $$select effective_date, goal, goal_kg_per_week from public.profile_versions order by effective_date$$,
  $$values
      ((now() at time zone 'America/Argentina/Buenos_Aires')::date - 30, 'lose'::text, 0.50::numeric(3, 2)),
      ((now() at time zone 'America/Argentina/Buenos_Aires')::date, 'gain'::text, 0.25::numeric(3, 2))$$,
  'a change on a later day adds a version and keeps the earlier one'
);

select results_eq(
  $$select protein_g_per_kg, carbs_share_pct, fat_share_pct from public.profile_versions order by effective_date$$,
  $$values (1.8::numeric(2, 1), 60::smallint, 40::smallint), (1.8::numeric(2, 1), 60::smallint, 40::smallint)$$,
  'versions copy the protein setting and the carbs/fat split (defaults here)'
);

update public.profiles set protein_g_per_kg = 2.4 where user_id = '00000000-0000-4000-a000-0000000000e1';

select results_eq(
  $$select protein_g_per_kg, carbs_share_pct, fat_share_pct from public.profile_versions
    where effective_date = (now() at time zone 'America/Argentina/Buenos_Aires')::date$$,
  $$values (2.4::numeric(2, 1), 60::smallint, 40::smallint)$$,
  'changing only the protein setting updates today''s version'
);

update public.profiles set carbs_share_pct = 50, fat_share_pct = 50 where user_id = '00000000-0000-4000-a000-0000000000e1';

select results_eq(
  $$select protein_g_per_kg, carbs_share_pct, fat_share_pct from public.profile_versions
    where effective_date = (now() at time zone 'America/Argentina/Buenos_Aires')::date$$,
  $$values (2.4::numeric(2, 1), 50::smallint, 50::smallint)$$,
  'changing only the carbs/fat split updates today''s version'
);

select results_eq(
  $$select protein_g_per_kg from public.profile_versions
    where effective_date = (now() at time zone 'America/Argentina/Buenos_Aires')::date - 30$$,
  array[1.8::numeric(2, 1)],
  'the earlier version keeps the protein setting it had'
);

select throws_ok(
  $$insert into public.profile_versions (user_id, effective_date, goal, goal_kg_per_week, protein_g_per_kg, carbs_share_pct, fat_share_pct)
    values ('00000000-0000-4000-a000-0000000000e1', '2026-01-01', 'gain', 1, 1.8, 60, 40)$$,
  '42501', null,
  'A cannot insert a version directly'
);

select throws_ok(
  $$update public.profile_versions set goal = 'maintain' where user_id = '00000000-0000-4000-a000-0000000000e1'$$,
  '42501', null,
  'A cannot rewrite their history'
);

select throws_ok(
  $$delete from public.profile_versions where user_id = '00000000-0000-4000-a000-0000000000e1'$$,
  '42501', null,
  'A cannot delete their history'
);

select throws_ok(
  $$select private.record_profile_version()$$,
  '42501', null,
  'A cannot call the trigger function'
);

select throws_ok(
  $$select private.backfill_profile_versions()$$,
  '42501', null,
  'A cannot call the backfill'
);

-- User B ---------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000e2","role":"authenticated"}', true);

select results_eq(
  $$select user_id, effective_date from public.profile_versions$$,
  $$values ('00000000-0000-4000-a000-0000000000e2'::uuid, '2026-09-20'::date)$$,
  'B sees only their own history'
);

select results_eq(
  $$with changed as (
      update public.profiles set goal = 'maintain' where user_id = '00000000-0000-4000-a000-0000000000e1' returning 1
    ) select count(*) from changed$$,
  array[0::bigint],
  'B cannot touch A''s profile, so no version is written for A'
);

-- Anonymous ------------------------------------------------------------------

set local role anon;

select throws_ok(
  $$select * from public.profile_versions$$,
  '42501', null,
  'anon cannot read profile_versions'
);

select * from finish();

rollback;
