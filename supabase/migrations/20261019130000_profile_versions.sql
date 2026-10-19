-- Profile history: the daily calorie target of a past day must come from the
-- profile as it was that day, so changing the goal does not rewrite history.
--
-- public.profile_versions keeps one snapshot of the target-relevant profile
-- columns per user per calendar day (effective_date, the app's day in
-- America/Argentina/Buenos_Aires, the same zone as src/lib/app-time.ts). A
-- version applies from its effective_date until the next one; Progress picks,
-- for each day, the latest version on or before it (and the earliest version
-- for days before any).
--
-- Writes only come from triggers on public.profiles: several edits on the
-- same day collapse into that day's row. Users can read their own versions
-- but never write them, so history cannot be edited through the Data API.

create table public.profile_versions (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  effective_date date not null,
  sex text,
  birth_date date,
  height_cm numeric(5, 1),
  activity_level text,
  goal text not null,
  goal_kg_per_week numeric(3, 2) not null,
  protein_pct smallint not null,
  carbs_pct smallint not null,
  fat_pct smallint not null,
  created_at timestamptz not null default now(),
  -- One version per user per day; also the index for "latest on or before".
  constraint profile_versions_pkey primary key (user_id, effective_date)
);

comment on table public.profile_versions is
  'Daily snapshots of the profile columns the calorie target depends on; written only by triggers on public.profiles.';
comment on column public.profile_versions.effective_date is
  'First day (Buenos Aires calendar day) this snapshot applies to; it lasts until the next version.';

alter table public.profile_versions enable row level security;

revoke all on table public.profile_versions from anon, authenticated;
grant select on table public.profile_versions to authenticated;
grant select, insert, update, delete on table public.profile_versions to service_role;

create policy "profile_versions: owner can select"
  on public.profile_versions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Trigger: snapshot the profile into today's version -------------------------
--
-- SECURITY DEFINER because authenticated has no write privilege on
-- profile_versions. It only copies NEW, whose user_id RLS on profiles has
-- already tied to the caller.

create or replace function private.record_profile_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile_versions (
    user_id, effective_date, sex, birth_date, height_cm, activity_level,
    goal, goal_kg_per_week, protein_pct, carbs_pct, fat_pct
  )
  values (
    new.user_id,
    (pg_catalog.now() at time zone 'America/Argentina/Buenos_Aires')::date,
    new.sex, new.birth_date, new.height_cm, new.activity_level,
    new.goal, new.goal_kg_per_week, new.protein_pct, new.carbs_pct, new.fat_pct
  )
  on conflict (user_id, effective_date) do update set
    sex = excluded.sex,
    birth_date = excluded.birth_date,
    height_cm = excluded.height_cm,
    activity_level = excluded.activity_level,
    goal = excluded.goal,
    goal_kg_per_week = excluded.goal_kg_per_week,
    protein_pct = excluded.protein_pct,
    carbs_pct = excluded.carbs_pct,
    fat_pct = excluded.fat_pct;
  return null;
end;
$$;

comment on function private.record_profile_version() is
  'Upserts today''s (Buenos Aires calendar day) public.profile_versions row from the new profile values.';

revoke all on function private.record_profile_version() from public, anon, authenticated;

create trigger profiles_record_version_on_insert
  after insert on public.profiles
  for each row execute function private.record_profile_version();

-- Only when a target-relevant value really changes: the Settings form saves
-- every column on each submit.
create trigger profiles_record_version_on_update
  after update of sex, birth_date, height_cm, activity_level, goal, goal_kg_per_week, protein_pct, carbs_pct, fat_pct
  on public.profiles
  for each row
  when (
    (old.sex, old.birth_date, old.height_cm, old.activity_level, old.goal, old.goal_kg_per_week,
     old.protein_pct, old.carbs_pct, old.fat_pct)
    is distinct from
    (new.sex, new.birth_date, new.height_cm, new.activity_level, new.goal, new.goal_kg_per_week,
     new.protein_pct, new.carbs_pct, new.fat_pct)
  )
  execute function private.record_profile_version();

-- Backfill --------------------------------------------------------------------
--
-- Profiles that existed before this migration get one version holding their
-- current values, effective from the earliest day with data: the profile's
-- creation day or the first food, activity or weight entry, whichever is
-- earlier. A function (not a one-off statement) so the pgTAP suite can prove
-- it; it skips users who already have a version, so it is safe to rerun.

create or replace function private.backfill_profile_versions()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted integer;
begin
  insert into public.profile_versions (
    user_id, effective_date, sex, birth_date, height_cm, activity_level,
    goal, goal_kg_per_week, protein_pct, carbs_pct, fat_pct
  )
  select
    p.user_id,
    least(
      (p.created_at at time zone 'America/Argentina/Buenos_Aires')::date,
      (select min(f.entry_date) from public.food_entries f where f.user_id = p.user_id),
      (select min(a.entry_date) from public.activity_entries a where a.user_id = p.user_id),
      (select min(w.entry_date) from public.weight_entries w where w.user_id = p.user_id)
    ),
    p.sex, p.birth_date, p.height_cm, p.activity_level,
    p.goal, p.goal_kg_per_week, p.protein_pct, p.carbs_pct, p.fat_pct
  from public.profiles p
  where not exists (select 1 from public.profile_versions v where v.user_id = p.user_id);

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

comment on function private.backfill_profile_versions() is
  'Gives every profile without history one version effective from its earliest data day; returns the rows inserted.';

revoke all on function private.backfill_profile_versions() from public, anon, authenticated;

select private.backfill_profile_versions();
