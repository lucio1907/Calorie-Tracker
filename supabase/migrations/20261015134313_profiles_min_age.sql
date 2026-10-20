-- Profiles belong to adults: the calorie target formulas are adult guidelines.
--
-- The app validates this in the Settings form; this trigger is the database
-- backstop for any other writer. A CHECK constraint cannot do it: "18 years
-- before today" depends on the current date, so it is not immutable (a
-- dump/restore or a later recheck would judge old rows against a new today).
--
-- "Today" is the app's calendar day in America/Argentina/Buenos_Aires (the
-- same zone as src/lib/app-time.ts), never the UTC day. A null birth_date is
-- still allowed: the profile row can exist before onboarding finishes.
--
-- Error contract (read by the Settings Server Action): SQLSTATE 23514
-- (check_violation) with the message prefix "profiles_min_age:".

create or replace function private.enforce_profile_min_age()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  app_today date := (pg_catalog.now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  if new.birth_date is not null and new.birth_date > (app_today - interval '18 years')::date then
    raise exception using
      errcode = 'check_violation',
      message = 'profiles_min_age: the profile owner must be at least 18 years old',
      table = 'profiles',
      column = 'birth_date',
      constraint = 'profiles_min_age';
  end if;
  return new;
end;
$$;

comment on function private.enforce_profile_min_age() is
  'Rejects a profiles.birth_date less than 18 years before today (Buenos Aires calendar day).';

revoke all on function private.enforce_profile_min_age() from public, anon, authenticated;

create trigger profiles_enforce_min_age
  before insert or update of birth_date on public.profiles
  for each row execute function private.enforce_profile_min_age();
