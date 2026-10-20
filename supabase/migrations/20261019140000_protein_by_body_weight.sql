-- Macro targets: protein by body weight, carbs and fat split what is left.
--
-- Before, protein, carbs and fat were each a percent of the daily calorie
-- target (protein_pct + carbs_pct + fat_pct = 100). In a calorie deficit that
-- shrinks protein together with calories, the opposite of what a diet needs.
-- Now:
-- - protein_g_per_kg: grams of protein per kg of the latest logged weight
--   (0.8-3.0, one decimal; default 1.8), so protein follows body weight and
--   not the calorie target;
-- - carbs_share_pct + fat_share_pct = 100: how the kcal left after protein
--   are split between carbs and fat (default 60/40).
-- The grams are computed by the app (src/domain/calculators/macro-targets.ts).
--
-- Existing rows (profiles and their history in profile_versions) get the
-- default 1.8 g/kg and keep their old carbs:fat ratio, normalized to 100
-- (40/30 becomes 57/43). A row whose old split was all protein has no ratio
-- to carry over and gets the 60/40 default.

-- The update trigger lists the old columns in its UPDATE OF list and WHEN
-- clause; it is recreated below with the new ones.
drop trigger profiles_record_version_on_update on public.profiles;

-- profiles --------------------------------------------------------------------

alter table public.profiles
  add column protein_g_per_kg numeric(2, 1) not null default 1.8
    constraint profiles_protein_g_per_kg_range check (protein_g_per_kg between 0.8 and 3.0),
  add column carbs_share_pct smallint not null default 60
    constraint profiles_carbs_share_pct_range check (carbs_share_pct between 0 and 100),
  add column fat_share_pct smallint not null default 40
    constraint profiles_fat_share_pct_range check (fat_share_pct between 0 and 100),
  add constraint profiles_carb_fat_split_total check (carbs_share_pct + fat_share_pct = 100);

comment on column public.profiles.protein_g_per_kg is
  'Daily protein target in grams per kg of the latest logged weight.';
comment on column public.profiles.carbs_share_pct is
  'Percent of the kcal left after protein that goes to carbs; carbs_share_pct + fat_share_pct = 100.';
comment on column public.profiles.fat_share_pct is
  'Percent of the kcal left after protein that goes to fat; carbs_share_pct + fat_share_pct = 100.';
comment on table public.profiles is
  'Per-user body data, activity level, weight goal and macro settings.';

-- Converting the stored split is not an edit by the user: keep updated_at.
alter table public.profiles disable trigger profiles_set_updated_at;

update public.profiles p
set (carbs_share_pct, fat_share_pct) = (converted.carbs, 100 - converted.carbs)
from (
  select user_id, round(100.0 * carbs_pct / (carbs_pct + fat_pct))::smallint as carbs
  from public.profiles
  where carbs_pct + fat_pct > 0
) converted
where converted.user_id = p.user_id;

alter table public.profiles enable trigger profiles_set_updated_at;

alter table public.profiles
  drop constraint profiles_macro_split_total,
  drop column protein_pct,
  drop column carbs_pct,
  drop column fat_pct;

-- profile_versions: same conversion for every snapshot ------------------------
--
-- No snapshot predates protein_g_per_kg, so all of them get the 1.8 default.
-- The defaults only fill existing rows: new versions always come from the
-- profile trigger, which copies every column.

alter table public.profile_versions
  add column protein_g_per_kg numeric(2, 1) not null default 1.8,
  add column carbs_share_pct smallint not null default 60,
  add column fat_share_pct smallint not null default 40;

update public.profile_versions v
set (carbs_share_pct, fat_share_pct) = (converted.carbs, 100 - converted.carbs)
from (
  select user_id, effective_date, round(100.0 * carbs_pct / (carbs_pct + fat_pct))::smallint as carbs
  from public.profile_versions
  where carbs_pct + fat_pct > 0
) converted
where converted.user_id = v.user_id and converted.effective_date = v.effective_date;

alter table public.profile_versions
  alter column protein_g_per_kg drop default,
  alter column carbs_share_pct drop default,
  alter column fat_share_pct drop default,
  drop column protein_pct,
  drop column carbs_pct,
  drop column fat_pct;

-- Trigger: snapshot the profile into today's version -------------------------

create or replace function private.record_profile_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile_versions (
    user_id, effective_date, sex, birth_date, height_cm, activity_level,
    goal, goal_kg_per_week, protein_g_per_kg, carbs_share_pct, fat_share_pct
  )
  values (
    new.user_id,
    (pg_catalog.now() at time zone 'America/Argentina/Buenos_Aires')::date,
    new.sex, new.birth_date, new.height_cm, new.activity_level,
    new.goal, new.goal_kg_per_week, new.protein_g_per_kg, new.carbs_share_pct, new.fat_share_pct
  )
  on conflict (user_id, effective_date) do update set
    sex = excluded.sex,
    birth_date = excluded.birth_date,
    height_cm = excluded.height_cm,
    activity_level = excluded.activity_level,
    goal = excluded.goal,
    goal_kg_per_week = excluded.goal_kg_per_week,
    protein_g_per_kg = excluded.protein_g_per_kg,
    carbs_share_pct = excluded.carbs_share_pct,
    fat_share_pct = excluded.fat_share_pct;
  return null;
end;
$$;

revoke all on function private.record_profile_version() from public, anon, authenticated;

-- Only when a target-relevant value really changes: the Settings form saves
-- every column on each submit.
create trigger profiles_record_version_on_update
  after update of sex, birth_date, height_cm, activity_level, goal, goal_kg_per_week,
    protein_g_per_kg, carbs_share_pct, fat_share_pct
  on public.profiles
  for each row
  when (
    (old.sex, old.birth_date, old.height_cm, old.activity_level, old.goal, old.goal_kg_per_week,
     old.protein_g_per_kg, old.carbs_share_pct, old.fat_share_pct)
    is distinct from
    (new.sex, new.birth_date, new.height_cm, new.activity_level, new.goal, new.goal_kg_per_week,
     new.protein_g_per_kg, new.carbs_share_pct, new.fat_share_pct)
  )
  execute function private.record_profile_version();

-- Backfill (same rules as in profile_versions, with the new columns) ---------

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
    goal, goal_kg_per_week, protein_g_per_kg, carbs_share_pct, fat_share_pct
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
    p.goal, p.goal_kg_per_week, p.protein_g_per_kg, p.carbs_share_pct, p.fat_share_pct
  from public.profiles p
  where not exists (select 1 from public.profile_versions v where v.user_id = p.user_id);

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke all on function private.backfill_profile_versions() from public, anon, authenticated;
