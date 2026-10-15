-- Diary of eaten food. Nutrients are snapshotted at log time so later edits
-- to the catalog or a recipe never rewrite history; food_id / recipe_id are
-- kept only as soft links (set null when the source is deleted).

create table public.food_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'snack', 'dinner', 'extra')),
  food_id bigint references public.foods (id) on delete set null,
  recipe_id bigint references public.recipes (id) on delete set null,
  label text not null check (char_length(label) between 1 and 200),
  grams numeric(7, 2) not null check (grams > 0 and grams <= 100000),
  kcal numeric(7, 2) not null check (kcal >= 0),
  protein numeric(6, 2) not null default 0 check (protein >= 0),
  carbs numeric(6, 2) not null default 0 check (carbs >= 0),
  fat numeric(6, 2) not null default 0 check (fat >= 0),
  created_at timestamptz not null default now(),
  constraint food_entries_single_source check (food_id is null or recipe_id is null)
);

comment on table public.food_entries is 'Logged food with nutrient snapshots (kcal and macros for the logged grams).';

-- Main access path: one user's diary for a day or a date range.
create index food_entries_user_id_entry_date_idx on public.food_entries (user_id, entry_date);
create index food_entries_food_id_idx on public.food_entries (food_id);
create index food_entries_recipe_id_idx on public.food_entries (recipe_id);

alter table public.food_entries enable row level security;

revoke all on table public.food_entries from anon, authenticated;
grant select, insert, update, delete on table public.food_entries to authenticated;
grant select, insert, update, delete on table public.food_entries to service_role;

create policy "food_entries: owner can select"
  on public.food_entries for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "food_entries: owner can insert"
  on public.food_entries for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      food_id is null
      or exists (
        select 1 from public.foods f
        where f.id = food_entries.food_id
          and (f.owner_id is null or f.owner_id = (select auth.uid()))
      )
    )
    and (
      recipe_id is null
      or exists (
        select 1 from public.recipes r
        where r.id = food_entries.recipe_id
          and r.user_id = (select auth.uid())
      )
    )
  );

create policy "food_entries: owner can update"
  on public.food_entries for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      food_id is null
      or exists (
        select 1 from public.foods f
        where f.id = food_entries.food_id
          and (f.owner_id is null or f.owner_id = (select auth.uid()))
      )
    )
    and (
      recipe_id is null
      or exists (
        select 1 from public.recipes r
        where r.id = food_entries.recipe_id
          and r.user_id = (select auth.uid())
      )
    )
  );

create policy "food_entries: owner can delete"
  on public.food_entries for delete
  to authenticated
  using ((select auth.uid()) = user_id);
