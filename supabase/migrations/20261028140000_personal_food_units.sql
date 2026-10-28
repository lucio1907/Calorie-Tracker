-- Personal food units: each user can say how much one "unidad" of a food
-- weighs for them (e.g. one slice of pan lactal = 25 g), on their own foods
-- and on the shared catalog, which has no portions of its own.
--
-- food_portions.owner_id:
--   null -> the food owner's portion, exactly as before (visible with the
--           food, written only by the food's owner);
--   set  -> that user's personal unit on any food they can see. Only that
--           user reads or writes it, and it can never be handed to someone
--           else (the WITH CHECK clauses pin owner_id to the caller).
-- The restrictive aal2 policy on food_portions (mfa_aal2_policies) still
-- applies to every command.

alter table public.food_portions
  add column owner_id uuid references auth.users (id) on delete cascade;

comment on column public.food_portions.owner_id is
  'null = portion of the food''s owner; set = that user''s personal unit, private to them.';

-- One label per food per owner; NULLS NOT DISTINCT keeps the food owner's
-- portions (owner_id null) unique among themselves as before, while two users
-- can each have their own "unidad" for the same shared food.
alter table public.food_portions drop constraint food_portions_food_label_key;
alter table public.food_portions
  add constraint food_portions_food_label_owner_key unique nulls not distinct (food_id, label, owner_id);

-- FK cascade, RLS filter and per-user quota count. Most rows have no owner.
create index food_portions_owner_id_idx on public.food_portions (owner_id) where owner_id is not null;

-- Policies -------------------------------------------------------------------

drop policy "food_portions: read when food is visible" on public.food_portions;
drop policy "food_portions: food owner can insert" on public.food_portions;
drop policy "food_portions: food owner can update" on public.food_portions;
drop policy "food_portions: food owner can delete" on public.food_portions;

create policy "food_portions: read when food is visible"
  on public.food_portions for select
  to authenticated
  using (
    (owner_id is null or owner_id = (select auth.uid()))
    and exists (
      select 1 from public.foods f
      where f.id = food_portions.food_id
        and (f.owner_id is null or f.owner_id = (select auth.uid()))
    )
  );

-- Writable rows: the food owner's portions of the caller's own food, or the
-- caller's personal units on a food they can see. USING and WITH CHECK share
-- the rule, so an update can neither reach other rows nor move one out of it.

create policy "food_portions: food owner or unit owner can insert"
  on public.food_portions for insert
  to authenticated
  with check (
    (
      owner_id is null
      and exists (
        select 1 from public.foods f
        where f.id = food_portions.food_id
          and f.owner_id = (select auth.uid())
      )
    )
    or (
      owner_id = (select auth.uid())
      and exists (
        select 1 from public.foods f
        where f.id = food_portions.food_id
          and (f.owner_id is null or f.owner_id = (select auth.uid()))
      )
    )
  );

create policy "food_portions: food owner or unit owner can update"
  on public.food_portions for update
  to authenticated
  using (
    (
      owner_id is null
      and exists (
        select 1 from public.foods f
        where f.id = food_portions.food_id
          and f.owner_id = (select auth.uid())
      )
    )
    or owner_id = (select auth.uid())
  )
  with check (
    (
      owner_id is null
      and exists (
        select 1 from public.foods f
        where f.id = food_portions.food_id
          and f.owner_id = (select auth.uid())
      )
    )
    or (
      owner_id = (select auth.uid())
      and exists (
        select 1 from public.foods f
        where f.id = food_portions.food_id
          and (f.owner_id is null or f.owner_id = (select auth.uid()))
      )
    )
  );

create policy "food_portions: food owner or unit owner can delete"
  on public.food_portions for delete
  to authenticated
  using (
    (
      owner_id is null
      and exists (
        select 1 from public.foods f
        where f.id = food_portions.food_id
          and f.owner_id = (select auth.uid())
      )
    )
    or owner_id = (select auth.uid())
  );

-- Quota ----------------------------------------------------------------------

-- food_portions_enforce_row_quota (row_quotas) caps rows per food_id as the
-- caller sees them; personal units also need a per-user cap, or one account
-- could add 50 units to each of thousands of catalog foods. Rows with
-- owner_id null are skipped by enforce_row_quota.
create trigger food_portions_enforce_owner_row_quota
  before insert on public.food_portions
  for each row execute function private.enforce_row_quota('2000', 'owner_id');
