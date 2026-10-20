-- Adult-only profiles: the profiles_enforce_min_age trigger rejects a birth
-- date less than 18 years before today (Buenos Aires calendar day) on insert,
-- update and the upsert path the Settings Server Action uses. now() is the
-- transaction start, so the trigger and these expressions agree on "today".
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

select has_trigger('public', 'profiles', 'profiles_enforce_min_age', 'profiles has the minimum-age trigger');

-- Fixtures (as postgres, bypassing RLS) -------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-0000000000d1', 'min-age-a@local.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000d2', 'min-age-b@local.test', 'authenticated', 'authenticated');

-- User A ---------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d1","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.profiles (user_id, birth_date)
    values (
      '00000000-0000-4000-a000-0000000000d1',
      ((now() at time zone 'America/Argentina/Buenos_Aires')::date - interval '18 years' + interval '1 day')::date
    )$$,
  '23514', 'profiles_min_age: the profile owner must be at least 18 years old',
  'inserting a profile that turns 18 tomorrow is rejected'
);

select lives_ok(
  $$insert into public.profiles (user_id, birth_date)
    values (
      '00000000-0000-4000-a000-0000000000d1',
      ((now() at time zone 'America/Argentina/Buenos_Aires')::date - interval '18 years')::date
    )$$,
  'inserting a profile that turns 18 today is accepted'
);

select throws_ok(
  $$update public.profiles
    set birth_date = ((now() at time zone 'America/Argentina/Buenos_Aires')::date - interval '10 years')::date
    where user_id = '00000000-0000-4000-a000-0000000000d1'$$,
  '23514', 'profiles_min_age: the profile owner must be at least 18 years old',
  'updating the birth date to under 18 is rejected'
);

select throws_ok(
  $$insert into public.profiles (user_id, birth_date)
    values (
      '00000000-0000-4000-a000-0000000000d1',
      ((now() at time zone 'America/Argentina/Buenos_Aires')::date - interval '18 years' + interval '1 day')::date
    )
    on conflict (user_id) do update set birth_date = excluded.birth_date$$,
  '23514', 'profiles_min_age: the profile owner must be at least 18 years old',
  'the upsert path rejects an under-18 birth date'
);

select lives_ok(
  $$update public.profiles set birth_date = '1990-05-20', height_cm = 170
    where user_id = '00000000-0000-4000-a000-0000000000d1'$$,
  'updating to an adult birth date is accepted'
);

select results_eq(
  $$select birth_date, height_cm from public.profiles$$,
  $$values ('1990-05-20'::date, 170::numeric(5, 1))$$,
  'the rejected writes left no trace'
);

-- User B: birth_date stays optional ------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000d2","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.profiles (user_id, sex, birth_date) values ('00000000-0000-4000-a000-0000000000d2', 'female', null)$$,
  'a profile without a birth date can be created'
);

select lives_ok(
  $$update public.profiles set sex = 'male', birth_date = null where user_id = '00000000-0000-4000-a000-0000000000d2'$$,
  'setting birth_date to null is accepted'
);

select results_eq(
  $$select sex, birth_date from public.profiles$$,
  $$values ('male'::text, null::date)$$,
  'B''s profile keeps a null birth date'
);

select * from finish();

rollback;
