import { z } from "zod";
import { LIMITS, toDecimal } from "@/features/foods/lib/food-schema";
import { recipesStrings } from "../strings";
import type { RecipeFieldErrors, RecipeFormState } from "./types";

const v = recipesStrings.validation;

/** recipes.servings is numeric(5,2) > 0; whole recipes rarely make more than this. */
export const MAX_SERVINGS = 999;
/** Same cap as a food portion (one ingredient is at most one big portion). */
export const MAX_INGREDIENT_GRAMS = LIMITS.portionGrams.max;
/** The recipe_items row quota (row_quotas migration): 100 per recipe. */
export const MAX_INGREDIENTS = 100;

/** Positive integer id (bigint identity columns stay well inside the safe range). */
export const recipeIdSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

function trimmed(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function positiveDecimal(max: number) {
  return z.preprocess(
    toDecimal,
    z
      .number({ error: (issue) => (issue.input === undefined ? v.required : v.number) })
      // 2 decimals are stored: anything below 0.01 would round to 0.
      .min(0.01, v.gramsRange(max))
      .max(max, v.gramsRange(max)),
  );
}

const nameSchema = z.preprocess(trimmed, z.string({ error: v.required }).min(1, v.required).max(200, v.nameLength));
const notesSchema = z.preprocess(
  (value) => (value === null || trimmed(value) === "" ? null : trimmed(value)),
  z.string().max(2000, v.notesLength).nullable(),
);
const servingsSchema = z.preprocess(
  toDecimal,
  z
    .number({ error: (issue) => (issue.input === undefined ? v.required : v.number) })
    .min(0.01, v.servingsRange(MAX_SERVINGS))
    .max(MAX_SERVINGS, v.servingsRange(MAX_SERVINGS)),
);
const gramsSchema = positiveDecimal(MAX_INGREDIENT_GRAMS);

/** One ingredient row as submitted. */
export type RecipeItemInput = { foodId: number; grams: number };

export type RecipeInput = {
  name: string;
  servings: number;
  notes: string | null;
  items: RecipeItemInput[];
};

export type ParseRecipeResult = { ok: true; value: RecipeInput } | { ok: false; state: RecipeFormState };

function failure(formError: string, fieldErrors: RecipeFieldErrors = {}, itemErrors: Record<number, string> = {}) {
  return { ok: false as const, state: { status: "error" as const, fieldErrors, itemErrors, formError } };
}

/**
 * Reads and validates the recipe form (same limits as public.save_recipe).
 * Ingredients arrive as parallel foodId / grams fields in form order; foodId
 * is a hidden input, so a malformed one is a tampered request, not a typo.
 */
export function parseRecipeForm(formData: FormData): ParseRecipeResult {
  const foodIds = formData.getAll("foodId");
  const grams = formData.getAll("grams");
  if (foodIds.length !== grams.length) {
    return failure(recipesStrings.errors.unexpected);
  }

  const fieldErrors: RecipeFieldErrors = {};
  const itemErrors: Record<number, string> = {};
  const name = nameSchema.safeParse(formData.get("name") ?? undefined);
  if (!name.success) fieldErrors.name = name.error.issues[0]?.message;
  const servings = servingsSchema.safeParse(formData.get("servings") ?? undefined);
  if (!servings.success) fieldErrors.servings = servings.error.issues[0]?.message;
  const notes = notesSchema.safeParse(formData.get("notes"));
  if (!notes.success) fieldErrors.notes = notes.error.issues[0]?.message;
  if (foodIds.length > MAX_INGREDIENTS) fieldErrors.items = v.tooManyItems(MAX_INGREDIENTS);

  const items: RecipeItemInput[] = [];
  for (const [index, rawFoodId] of foodIds.entries()) {
    const foodId = recipeIdSchema.safeParse(rawFoodId);
    if (!foodId.success) return failure(recipesStrings.errors.unexpected);

    const amount = gramsSchema.safeParse(grams[index]);
    if (amount.success) items.push({ foodId: foodId.data, grams: amount.data });
    else itemErrors[index] = amount.error.issues[0]?.message ?? v.number;
  }

  if (!name.success || !servings.success || !notes.success || fieldErrors.items || Object.keys(itemErrors).length > 0) {
    return failure(v.fix, fieldErrors, itemErrors);
  }
  return { ok: true, value: { name: name.data, servings: servings.data, notes: notes.data, items } };
}
