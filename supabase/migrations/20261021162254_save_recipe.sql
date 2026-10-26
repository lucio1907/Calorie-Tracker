-- Atomic recipe save.
--
-- A recipe and its ingredients are edited together in one form. Through the
-- Data API that took several requests (update the recipe, then remove, update
-- and add ingredients), so a failure part-way left a half-saved recipe.
-- public.save_recipe() creates or updates the recipe and replaces its
-- ingredients in one statement, so the whole save commits or nothing does.
--
-- SECURITY INVOKER: every write goes through the caller's RLS (owner
-- policies, the restrictive aal2 policies, recipe_items' "visible foods
-- only" check) and the row quota triggers, exactly like direct writes.
-- Ingredients are replaced, not diffed: their ids are referenced by nothing,
-- and the deleted rows no longer count against the per-recipe quota.
--
-- Input:
-- - recipe_id null creates a recipe for the caller; otherwise it updates that
--   recipe, which must be the caller's.
-- - ingredients: a JSON array, in display order, of
--   {"food_id": <positive integer>, "grams": <number>}; position is the
--   array index. Same limits as the app (src/features/recipes/lib/recipe-schema.ts).
--
-- Error contract (read by the Server Actions):
-- - 22023 (invalid_parameter_value): name, servings, notes or ingredients
--   out of shape or bounds (name 1-200 characters, servings in (0, 999],
--   notes at most 2000 characters, at most 100 ingredients, grams in (0, 10000]).
-- - P0002 (no_data_found): recipe_id is not one of the caller's recipes
--   (or is hidden from an aal1 session of an MFA user).
-- - 42501 (insufficient_privilege): RLS rejected a row, e.g. an ingredient
--   whose food the caller cannot see (table recipe_items in the message).
-- - 23514 with the "row_quota:<table>:" message prefix: a row quota.

create or replace function public.save_recipe(
  name text,
  servings numeric,
  ingredients jsonb,
  notes text default null,
  recipe_id bigint default null
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  saved_id bigint;
  item jsonb;
begin
  if save_recipe.name is null or pg_catalog.char_length(save_recipe.name) not between 1 and 200 then
    raise exception 'name must have 1 to 200 characters' using errcode = '22023';
  end if;
  if save_recipe.servings is null
     or pg_catalog.round(save_recipe.servings, 2) <= 0
     or save_recipe.servings > 999 then
    raise exception 'servings must be greater than 0 and at most 999' using errcode = '22023';
  end if;
  if save_recipe.notes is not null and pg_catalog.char_length(save_recipe.notes) > 2000 then
    raise exception 'notes must have at most 2000 characters' using errcode = '22023';
  end if;
  if save_recipe.ingredients is null or pg_catalog.jsonb_typeof(save_recipe.ingredients) <> 'array' then
    raise exception 'ingredients must be a JSON array' using errcode = '22023';
  end if;
  if pg_catalog.jsonb_array_length(save_recipe.ingredients) > 100 then
    raise exception 'a recipe has at most 100 ingredients' using errcode = '22023';
  end if;

  for item in select value from pg_catalog.jsonb_array_elements(save_recipe.ingredients) loop
    -- Shape first, so the casts below only ever see JSON numbers.
    if pg_catalog.jsonb_typeof(item) is distinct from 'object'
       or pg_catalog.jsonb_typeof(item -> 'food_id') is distinct from 'number'
       or pg_catalog.jsonb_typeof(item -> 'grams') is distinct from 'number' then
      raise exception 'invalid ingredient: %', item using errcode = '22023';
    end if;
    if (item ->> 'food_id') !~ '^[1-9][0-9]{0,17}$'
       or pg_catalog.round((item ->> 'grams')::numeric, 2) <= 0
       or (item ->> 'grams')::numeric > 10000 then
      raise exception 'invalid ingredient: %', item using errcode = '22023';
    end if;
  end loop;

  if save_recipe.recipe_id is null then
    insert into public.recipes (user_id, name, servings, notes)
    values ((select auth.uid()), save_recipe.name, save_recipe.servings, save_recipe.notes)
    returning id into saved_id;
  else
    update public.recipes r
    set name = save_recipe.name, servings = save_recipe.servings, notes = save_recipe.notes
    where r.id = save_recipe.recipe_id
    returning r.id into saved_id;
    if saved_id is null then
      raise exception 'recipe % not found', save_recipe.recipe_id using errcode = 'P0002';
    end if;
    delete from public.recipe_items i where i.recipe_id = saved_id;
  end if;

  insert into public.recipe_items (recipe_id, food_id, grams, position)
  select saved_id, (e.value ->> 'food_id')::bigint, (e.value ->> 'grams')::numeric, (e.ordinality - 1)::smallint
  from pg_catalog.jsonb_array_elements(save_recipe.ingredients) with ordinality as e (value, ordinality)
  order by e.ordinality;

  return saved_id;
end;
$$;

comment on function public.save_recipe(text, numeric, jsonb, text, bigint) is
  'Creates (recipe_id null) or updates one of the caller''s recipes and replaces its ingredients atomically. RLS applies: SECURITY INVOKER.';

revoke all on function public.save_recipe(text, numeric, jsonb, text, bigint) from public, anon;
grant execute on function public.save_recipe(text, numeric, jsonb, text, bigint) to authenticated;
