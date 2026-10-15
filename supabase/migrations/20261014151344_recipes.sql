-- User-owned recipes composed of catalog foods.

create table public.recipes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  servings numeric(5, 2) not null default 1 check (servings > 0),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.recipes is 'User-owned recipes. Nutrients derive from recipe_items.';

create index recipes_user_id_idx on public.recipes (user_id);

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function private.set_updated_at();

alter table public.recipes enable row level security;

revoke all on table public.recipes from anon, authenticated;
grant select, insert, update, delete on table public.recipes to authenticated;
grant select, insert, update, delete on table public.recipes to service_role;

create policy "recipes: owner can select"
  on public.recipes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "recipes: owner can insert"
  on public.recipes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "recipes: owner can update"
  on public.recipes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "recipes: owner can delete"
  on public.recipes for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- Ingredients of a recipe. Ownership derives from the parent recipe.
-- food_id is NO ACTION + DEFERRABLE INITIALLY DEFERRED: deleting a food that a
-- recipe still uses fails at commit, but deleting an account works because
-- the cascades remove the user's recipes and foods in the same transaction
-- and the check only runs once both are gone.

create table public.recipe_items (
  id bigint generated always as identity primary key,
  recipe_id bigint not null references public.recipes (id) on delete cascade,
  food_id bigint not null references public.foods (id) deferrable initially deferred,
  grams numeric(7, 2) not null check (grams > 0 and grams <= 100000),
  position smallint not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

comment on table public.recipe_items is 'Recipe ingredients. Access derives from the parent recipe.';

create index recipe_items_recipe_id_idx on public.recipe_items (recipe_id);
create index recipe_items_food_id_idx on public.recipe_items (food_id);

alter table public.recipe_items enable row level security;

revoke all on table public.recipe_items from anon, authenticated;
grant select, insert, update, delete on table public.recipe_items to authenticated;
grant select, insert, update, delete on table public.recipe_items to service_role;

create policy "recipe_items: recipe owner can select"
  on public.recipe_items for select
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_items.recipe_id
        and r.user_id = (select auth.uid())
    )
  );

create policy "recipe_items: recipe owner can insert visible foods"
  on public.recipe_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_items.recipe_id
        and r.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.foods f
      where f.id = recipe_items.food_id
        and (f.owner_id is null or f.owner_id = (select auth.uid()))
    )
  );

create policy "recipe_items: recipe owner can update"
  on public.recipe_items for update
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_items.recipe_id
        and r.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_items.recipe_id
        and r.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.foods f
      where f.id = recipe_items.food_id
        and (f.owner_id is null or f.owner_id = (select auth.uid()))
    )
  );

create policy "recipe_items: recipe owner can delete"
  on public.recipe_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_items.recipe_id
        and r.user_id = (select auth.uid())
    )
  );
