-- Body weight log: at most one measurement per user per day.

create table public.weight_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date date not null,
  kg numeric(5, 2) not null check (kg between 20 and 400),
  created_at timestamptz not null default now(),
  -- Also the index for user_id lookups and date-range scans.
  constraint weight_entries_user_id_entry_date_key unique (user_id, entry_date)
);

comment on table public.weight_entries is 'Daily body weight, one row per user per date.';

alter table public.weight_entries enable row level security;

revoke all on table public.weight_entries from anon, authenticated;
grant select, insert, update, delete on table public.weight_entries to authenticated;
grant select, insert, update, delete on table public.weight_entries to service_role;

create policy "weight_entries: owner can select"
  on public.weight_entries for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "weight_entries: owner can insert"
  on public.weight_entries for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "weight_entries: owner can update"
  on public.weight_entries for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "weight_entries: owner can delete"
  on public.weight_entries for delete
  to authenticated
  using ((select auth.uid()) = user_id);
