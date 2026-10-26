"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/features/auth/data/current-user";
import type { ActionResult } from "@/features/foods/lib/types";
import { isRowQuotaViolation } from "@/lib/supabase/row-quota";
import { createClient } from "@/lib/supabase/server";
import { MAX_INGREDIENTS, parseRecipeForm, recipeIdSchema } from "../lib/recipe-schema";
import type { RecipeFormState } from "../lib/types";
import { recipesStrings as t } from "../strings";

/*
 * Mutations for the caller's recipes. Each action re-checks the session;
 * saves go through public.save_recipe (SECURITY INVOKER, one transaction),
 * so RLS scopes them to the caller and only lets ingredients use foods the
 * caller can see. Nutrients are never written: they are computed from the
 * ingredients when read or logged.
 * Docs: node_modules/next/dist/docs/01-app/02-guides/server-actions.md
 */

const RLS_VIOLATION = "42501";
const NO_DATA_FOUND = "P0002";

function failed(formError: string): RecipeFormState {
  return { status: "error", fieldErrors: {}, itemErrors: {}, formError };
}

const SAVED: RecipeFormState = { status: "saved", fieldErrors: {}, itemErrors: {}, formError: null };

/** Message for a failed save_recipe call (error contract in the save_recipe migration). */
function saveError(error: { code?: string; message?: string }): string {
  const message = error.message ?? "";
  if (error.code === NO_DATA_FOUND) return t.errors.recipeMissing;
  // recipe_items only accepts foods the caller can see.
  if (error.code === RLS_VIOLATION && message.includes('table "recipe_items"')) return t.errors.foodMissing;
  if (isRowQuotaViolation(error)) {
    return message.startsWith("row_quota:recipe_items:") ? t.validation.tooManyItems(MAX_INGREDIENTS) : t.errors.limitReached;
  }
  console.error("[recipes] save failed", error.code, error.message);
  return t.errors.saveFailed;
}

/** Validates the form and saves it with public.save_recipe: the recipe and its ingredients commit together. */
async function save(formData: FormData, recipeId: number | undefined): Promise<RecipeFormState> {
  const parsed = parseRecipeForm(formData);
  if (!parsed.ok) return parsed.state;
  const { name, servings, notes, items } = parsed.value;

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_recipe", {
    recipe_id: recipeId,
    name,
    servings,
    notes: notes ?? undefined,
    // Array order is the display order (position).
    ingredients: items.map((item) => ({ food_id: item.foodId, grams: item.grams })),
  });
  if (error) return failed(saveError(error));

  refresh();
  return SAVED;
}

/** Form action: creates a recipe and its ingredients. */
export async function createRecipe(_previous: RecipeFormState, formData: FormData): Promise<RecipeFormState> {
  const user = await getCurrentUser();
  if (!user) return failed(t.errors.unauthorized);
  return save(formData, undefined);
}

/** Form action: saves a recipe's fields and replaces its ingredients. */
export async function updateRecipe(_previous: RecipeFormState, formData: FormData): Promise<RecipeFormState> {
  const user = await getCurrentUser();
  if (!user) return failed(t.errors.unauthorized);
  const recipeId = recipeIdSchema.safeParse(formData.get("recipeId"));
  if (!recipeId.success) return failed(t.errors.unexpected);
  return save(formData, recipeId.data);
}

/** Deletes one of the caller's recipes. Diary entries keep their snapshots (recipe_id becomes null). */
export async function deleteRecipe(recipeId: number): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t.errors.unauthorized };
  const id = recipeIdSchema.safeParse(recipeId);
  if (!id.success) return { ok: false, error: t.delete.failed };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id.data)
    .eq("user_id", user.id)
    .select("id");
  if (error) {
    console.error("[recipes] delete failed", error.code, error.message);
    return { ok: false, error: t.delete.failed };
  }
  if (data.length === 0) return { ok: false, error: t.errors.recipeMissing };

  refresh();
  return { ok: true, data: undefined };
}
