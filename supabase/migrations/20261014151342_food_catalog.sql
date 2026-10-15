-- Food catalog: shared rows (owner_id is null, e.g. imported ARGENFOODS data)
-- plus each user's own rows (custom foods or cached Open Food Facts products).
-- Nutrients are stored per 100 g.

create table public.foods (
  id bigint generated always as identity primary key,
  owner_id uuid references auth.users (id) on delete cascade,
  source text not null check (source in ('argenfoods', 'off', 'custom')),
  name text not null check (char_length(name) between 1 and 200),
  brand text check (char_length(brand) <= 200),
  barcode text check (barcode ~ '^[0-9]{8,14}$'),
  kcal_per_100g numeric(6, 2) not null check (kcal_per_100g between 0 and 900),
  protein_per_100g numeric(5, 2) not null default 0 check (protein_per_100g between 0 and 100),
  carbs_per_100g numeric(5, 2) not null default 0 check (carbs_per_100g between 0 and 100),
  fat_per_100g numeric(5, 2) not null default 0 check (fat_per_100g between 0 and 100),
  fiber_per_100g numeric(5, 2) check (fiber_per_100g between 0 and 100),
  sodium_mg_per_100g numeric(7, 2) check (sodium_mg_per_100g between 0 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A custom food always belongs to someone; only imports can be shared.
  constraint foods_custom_has_owner check (source <> 'custom' or owner_id is not null)
);

comment on table public.foods is 'Food catalog. owner_id null = shared catalog row, otherwise private to that user.';

-- One barcode per owner; NULLS NOT DISTINCT makes the shared catalog (owner_id
-- null) its own scope too.
create unique index foods_owner_barcode_key
  on public.foods (owner_id, barcode) nulls not distinct
  where barcode is not null;

-- FK + RLS filter column.
create index foods_owner_id_idx on public.foods (owner_id);
-- Barcode scans look up own + shared rows by barcode alone.
create index foods_barcode_idx on public.foods (barcode) where barcode is not null;
-- Substring/typo-tolerant name search (ILIKE '%term%', similarity()).
create index foods_name_trgm_idx on public.foods using gin (name extensions.gin_trgm_ops);

create trigger foods_set_updated_at
  before update on public.foods
  for each row execute function private.set_updated_at();

alter table public.foods enable row level security;

revoke all on table public.foods from anon, authenticated;
grant select, insert, update, delete on table public.foods to authenticated;
grant select, insert, update, delete on table public.foods to service_role;

create policy "foods: read own or shared"
  on public.foods for select
  to authenticated
  using (owner_id is null or (select auth.uid()) = owner_id);

create policy "foods: owner can insert"
  on public.foods for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "foods: owner can update"
  on public.foods for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "foods: owner can delete"
  on public.foods for delete
  to authenticated
  using ((select auth.uid()) = owner_id);


-- Named serving sizes for a food (e.g. "1 slice" = 25 g).
-- Visibility follows the parent food; only the food's owner can change them.

create table public.food_portions (
  id bigint generated always as identity primary key,
  food_id bigint not null references public.foods (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 100),
  grams numeric(7, 2) not null check (grams > 0 and grams <= 10000),
  created_at timestamptz not null default now(),
  constraint food_portions_food_label_key unique (food_id, label)
);

comment on table public.food_portions is 'Named serving sizes. Access derives from the parent food.';

-- The unique (food_id, label) index also serves the FK lookups on food_id.

alter table public.food_portions enable row level security;

revoke all on table public.food_portions from anon, authenticated;
grant select, insert, update, delete on table public.food_portions to authenticated;
grant select, insert, update, delete on table public.food_portions to service_role;

create policy "food_portions: read when food is visible"
  on public.food_portions for select
  to authenticated
  using (
    exists (
      select 1 from public.foods f
      where f.id = food_portions.food_id
        and (f.owner_id is null or f.owner_id = (select auth.uid()))
    )
  );

create policy "food_portions: food owner can insert"
  on public.food_portions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.foods f
      where f.id = food_portions.food_id
        and f.owner_id = (select auth.uid())
    )
  );

create policy "food_portions: food owner can update"
  on public.food_portions for update
  to authenticated
  using (
    exists (
      select 1 from public.foods f
      where f.id = food_portions.food_id
        and f.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.foods f
      where f.id = food_portions.food_id
        and f.owner_id = (select auth.uid())
    )
  );

create policy "food_portions: food owner can delete"
  on public.food_portions for delete
  to authenticated
  using (
    exists (
      select 1 from public.foods f
      where f.id = food_portions.food_id
        and f.owner_id = (select auth.uid())
    )
  );


-- Foods a user starred for quick logging.

create table public.food_favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food_id bigint not null references public.foods (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, food_id)
);

comment on table public.food_favorites is 'Per-user starred foods.';

-- PK covers user_id; food_id needs its own index for FK cascades.
create index food_favorites_food_id_idx on public.food_favorites (food_id);

alter table public.food_favorites enable row level security;

revoke all on table public.food_favorites from anon, authenticated;
grant select, insert, delete on table public.food_favorites to authenticated;
grant select, insert, update, delete on table public.food_favorites to service_role;

create policy "food_favorites: owner can select"
  on public.food_favorites for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "food_favorites: owner can insert visible foods"
  on public.food_favorites for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.foods f
      where f.id = food_favorites.food_id
        and (f.owner_id is null or f.owner_id = (select auth.uid()))
    )
  );

create policy "food_favorites: owner can delete"
  on public.food_favorites for delete
  to authenticated
  using ((select auth.uid()) = user_id);
