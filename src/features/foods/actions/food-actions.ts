"use server";

import { getCurrentUser } from "@/features/auth/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { foodIdSchema, parseFoodForm, readFoodFormValues } from "../lib/food-schema";
import type { FoodFormState } from "../lib/form-state";
import type { ActionResult, FoodValues } from "../lib/types";
import { foodsStrings as t } from "../strings";

/*
 * Mutations for the user's own foods. Each action re-checks the session and
 * scopes writes to owner_id = the caller; RLS enforces the same rule again.
 * Docs: https://nextjs.org/docs/app/guides/server-actions#security
 */

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

function toColumns(food: FoodValues) {
  return {
    name: food.name,
    brand: food.brand,
    barcode: food.barcode,
    kcal_per_100g: food.kcal,
    protein_per_100g: food.protein,
    carbs_per_100g: food.carbs,
    fat_per_100g: food.fat,
    fiber_per_100g: food.fiber,
    sodium_mg_per_100g: food.sodiumMg,
  };
}

function formError(previous: FoodFormState, values: FoodFormState["values"], message: string): FoodFormState {
  return { ...previous, status: "error", fieldErrors: {}, formError: message, values };
}

export async function createFood(previous: FoodFormState, formData: FormData): Promise<FoodFormState> {
  const user = await getCurrentUser();
  if (!user) return formError(previous, readFoodFormValues(formData), t.errors.unauthorized);
  const parsed = parseFoodForm(formData);
  if (!parsed.ok) {
    return { status: "error", fieldErrors: parsed.fieldErrors, formError: parsed.formError, values: parsed.values, foodId: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .insert({ ...toColumns(parsed.value), owner_id: user.id, source: "custom" })
    .select("id")
    .single();

  if (error?.code === UNIQUE_VIOLATION) {
    return {
      status: "error",
      fieldErrors: { barcode: t.form.duplicateBarcode },
      formError: t.validation.fix,
      values: readFoodFormValues(formData),
      foodId: null,
    };
  }
  if (error) return formError(previous, readFoodFormValues(formData), t.form.failed);

  return { status: "saved", fieldErrors: {}, formError: null, values: {}, foodId: data.id };
}

export async function updateFood(previous: FoodFormState, formData: FormData): Promise<FoodFormState> {
  const user = await getCurrentUser();
  if (!user) return formError(previous, readFoodFormValues(formData), t.errors.unauthorized);
  const foodId = foodIdSchema.safeParse(formData.get("foodId"));
  if (!foodId.success) return formError(previous, readFoodFormValues(formData), t.form.failed);
  const parsed = parseFoodForm(formData);
  if (!parsed.ok) {
    return { status: "error", fieldErrors: parsed.fieldErrors, formError: parsed.formError, values: parsed.values, foodId: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .update(toColumns(parsed.value))
    .eq("id", foodId.data)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error?.code === UNIQUE_VIOLATION) {
    return {
      status: "error",
      fieldErrors: { barcode: t.form.duplicateBarcode },
      formError: t.validation.fix,
      values: readFoodFormValues(formData),
      foodId: null,
    };
  }
  if (error || !data) return formError(previous, readFoodFormValues(formData), t.form.failed);

  return { status: "saved", fieldErrors: {}, formError: null, values: {}, foodId: data.id };
}

export async function deleteFood(foodId: number): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t.errors.unauthorized };
  const id = foodIdSchema.safeParse(foodId);
  if (!id.success) return { ok: false, error: t.detail.deleteFailed };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .delete()
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .select("id");

  // recipe_items.food_id is a deferred NO ACTION FK: deleting a food a recipe uses fails.
  if (error?.code === FOREIGN_KEY_VIOLATION) return { ok: false, error: t.detail.deleteInUse };
  if (error || data.length === 0) return { ok: false, error: t.detail.deleteFailed };
  return { ok: true, data: undefined };
}

export async function setFavorite(foodId: number, favorite: boolean): Promise<ActionResult<{ isFavorite: boolean }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t.errors.unauthorized };
  const id = foodIdSchema.safeParse(foodId);
  if (!id.success || typeof favorite !== "boolean") return { ok: false, error: t.detail.favoriteFailed };

  const supabase = await createClient();
  if (favorite) {
    // RLS only lets users star foods they can see.
    const { error } = await supabase.from("food_favorites").insert({ user_id: user.id, food_id: id.data });
    if (error && error.code !== UNIQUE_VIOLATION) return { ok: false, error: t.detail.favoriteFailed };
  } else {
    const { error } = await supabase.from("food_favorites").delete().eq("user_id", user.id).eq("food_id", id.data);
    if (error) return { ok: false, error: t.detail.favoriteFailed };
  }
  return { ok: true, data: { isFavorite: favorite } };
}
