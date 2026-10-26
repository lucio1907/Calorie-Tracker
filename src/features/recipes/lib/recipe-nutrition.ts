import { nutrientsForGrams, sumNutrients, type Nutrients } from "@/domain";
import type { Recipe } from "./types";

export type RecipeNutrition = {
  totalGrams: number;
  /** Total grams / servings, rounded to 2 decimals: the "1 serving" portion. */
  servingGrams: number;
  /** Per 100 g of the cooked-together ingredients, at database precision. */
  per100g: Nutrients;
  /** What logging 1 serving stores (per100g applied to servingGrams). */
  perServing: Nutrients;
};

/** Why a recipe has no nutrition: no ingredients, or one whose food is no longer visible. */
export type RecipeProblem = "empty" | "missing_food";

export type RecipeNutritionResult = { ok: true; value: RecipeNutrition } | { ok: false; error: RecipeProblem };

/** Integer hundredths: the database stores grams and servings with 2 decimals. */
function toHundredths(value: number): number {
  return Math.round(value * 100);
}

/**
 * A recipe's nutrients, computed from its ingredients (never stored), so it
 * can be logged like a food: per-100 g values plus one "serving" portion.
 * Each ingredient uses the same math as a diary snapshot (nutrientsForGrams);
 * the per-100 g values and the serving grams are rounded half up to 2
 * decimals, like a food's stored values, so a logged serving goes through
 * exactly the same path as a logged food portion.
 */
export function recipeNutrition(recipe: Pick<Recipe, "servings" | "items">): RecipeNutritionResult {
  if (recipe.items.length === 0) return { ok: false, error: "empty" };

  const parts: Nutrients[] = [];
  let gramsHundredths = 0;
  for (const item of recipe.items) {
    if (!item.food) return { ok: false, error: "missing_food" };
    parts.push(nutrientsForGrams(item.food, item.grams));
    gramsHundredths += toHundredths(item.grams);
  }

  const total = sumNutrients(parts);
  // per100 = total x 100 / grams; in hundredths: totalHundredths x 10000 / gramsHundredths.
  const per100 = (value: number) => Math.round((toHundredths(value) * 10_000) / gramsHundredths) / 100;
  const per100g = { kcal: per100(total.kcal), protein: per100(total.protein), carbs: per100(total.carbs), fat: per100(total.fat) };
  const servingGrams = Math.round((gramsHundredths * 100) / toHundredths(recipe.servings)) / 100;

  return {
    ok: true,
    value: { totalGrams: gramsHundredths / 100, servingGrams, per100g, perServing: nutrientsForGrams(per100g, servingGrams) },
  };
}
