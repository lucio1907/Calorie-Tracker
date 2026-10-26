import type { Nutrients } from "@/domain";
import { recipeNutrition, type RecipeProblem } from "@/features/recipes/lib/recipe-nutrition";
import type { Recipe } from "@/features/recipes/lib/types";
import { diaryStrings } from "../strings";
import type { PortionOption } from "./entry-amount";

/** Unit value of a recipe's only portion. Portion ids are never compared across foods and recipes. */
export const SERVING_PORTION_ID = 1;

/** What the entry form and the entry actions need to log something: per-100 g values and portions. */
export type LoggableFood = Nutrients & { name: string; portions: PortionOption[] };

export type RecipeFoodResult = { ok: true; food: LoggableFood } | { ok: false; error: RecipeProblem };

/**
 * A recipe as a loggable food: per-100 g values from its ingredients and a
 * single "1 serving" portion (total grams / servings). Used both for the
 * form preview and, on the server, for the stored snapshot.
 */
export function recipeAsFood(recipe: Recipe): RecipeFoodResult {
  const nutrition = recipeNutrition(recipe);
  if (!nutrition.ok) return nutrition;
  const { per100g, servingGrams } = nutrition.value;
  return {
    ok: true,
    food: {
      name: recipe.name,
      ...per100g,
      portions: servingGrams > 0 ? [{ id: SERVING_PORTION_ID, label: diaryStrings.units.serving, grams: servingGrams }] : [],
    },
  };
}

/** Why a recipe cannot be logged, for the user. */
export function recipeProblemMessage(problem: RecipeProblem): string {
  return problem === "empty" ? diaryStrings.errors.recipeEmpty : diaryStrings.errors.recipeFoodMissing;
}
