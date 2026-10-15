-- Activity catalog with MET values: shared rows (owner_id is null, seeded
-- from the 2024 Adult Compendium of Physical Activities) plus custom ones.

create table public.activities (
  id bigint generated always as identity primary key,
  owner_id uuid references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  met numeric(4, 1) not null check (met > 0 and met <= 30),
  category text not null check (category in ('walking', 'running', 'cycling', 'gym', 'sports', 'swimming', 'dance', 'other')),
  compendium_code text check (compendium_code ~ '^[0-9]{5}$'),
  created_at timestamptz not null default now(),
  constraint activities_owner_name_key unique nulls not distinct (owner_id, name)
);

comment on table public.activities is 'MET catalog. owner_id null = shared row, otherwise private to that user.';
comment on column public.activities.compendium_code is '2024 Adult Compendium activity code, when the row comes from it.';

-- The unique (owner_id, name) index also serves FK + RLS lookups on owner_id.

alter table public.activities enable row level security;

revoke all on table public.activities from anon, authenticated;
grant select, insert, update, delete on table public.activities to authenticated;
grant select, insert, update, delete on table public.activities to service_role;

create policy "activities: read own or shared"
  on public.activities for select
  to authenticated
  using (owner_id is null or (select auth.uid()) = owner_id);

create policy "activities: owner can insert"
  on public.activities for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "activities: owner can update"
  on public.activities for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "activities: owner can delete"
  on public.activities for delete
  to authenticated
  using ((select auth.uid()) = owner_id);


-- Logged exercise. kcal is snapshotted at log time (MET x weight x hours).

create table public.activity_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date date not null,
  activity_id bigint references public.activities (id) on delete set null,
  label text not null check (char_length(label) between 1 and 200),
  minutes numeric(6, 1) not null check (minutes > 0 and minutes <= 1440),
  kcal numeric(7, 2) not null check (kcal >= 0),
  created_at timestamptz not null default now()
);

comment on table public.activity_entries is 'Logged exercise with a kcal snapshot.';

create index activity_entries_user_id_entry_date_idx on public.activity_entries (user_id, entry_date);
create index activity_entries_activity_id_idx on public.activity_entries (activity_id);

alter table public.activity_entries enable row level security;

revoke all on table public.activity_entries from anon, authenticated;
grant select, insert, update, delete on table public.activity_entries to authenticated;
grant select, insert, update, delete on table public.activity_entries to service_role;

create policy "activity_entries: owner can select"
  on public.activity_entries for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "activity_entries: owner can insert"
  on public.activity_entries for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      activity_id is null
      or exists (
        select 1 from public.activities a
        where a.id = activity_entries.activity_id
          and (a.owner_id is null or a.owner_id = (select auth.uid()))
      )
    )
  );

create policy "activity_entries: owner can update"
  on public.activity_entries for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      activity_id is null
      or exists (
        select 1 from public.activities a
        where a.id = activity_entries.activity_id
          and (a.owner_id is null or a.owner_id = (select auth.uid()))
      )
    )
  );

create policy "activity_entries: owner can delete"
  on public.activity_entries for delete
  to authenticated
  using ((select auth.uid()) = user_id);
