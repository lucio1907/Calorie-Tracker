-- Body data and goals used to compute the daily calorie target.
-- One row per user; anthropometric fields stay nullable until onboarding
-- completes so a profile can be created before every value is known.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sex text check (sex in ('male', 'female')),
  birth_date date check (birth_date > date '1900-01-01'),
  height_cm numeric(5, 1) check (height_cm > 0 and height_cm < 300),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal text not null default 'maintain' check (goal in ('lose', 'maintain', 'gain')),
  goal_kg_per_week numeric(3, 2) not null default 0 check (goal_kg_per_week >= 0 and goal_kg_per_week <= 1.5),
  protein_pct smallint not null default 30 check (protein_pct between 0 and 100),
  carbs_pct smallint not null default 40 check (carbs_pct between 0 and 100),
  fat_pct smallint not null default 30 check (fat_pct between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_macro_split_total check (protein_pct + carbs_pct + fat_pct = 100)
);

comment on table public.profiles is 'Per-user body data, activity level, weight goal and macro split.';
comment on column public.profiles.goal_kg_per_week is 'Magnitude of the weekly weight change; the goal gives the sign.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;

create policy "profiles: owner can select"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "profiles: owner can insert"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "profiles: owner can update"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
