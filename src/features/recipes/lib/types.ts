import type { Nutrients } from "@/domain";

/** An ingredient's food as the caller sees it. Nutrients are per 100 g. */
export type IngredientFood = Nutrients & { name: string; brand: string | null };

/** One recipe_items row. */
export type RecipeIngredient = {
  id: number;
  foodId: number;
  grams: number;
  /** Null when the food is no longer visible to the caller. */
  food: IngredientFood | null;
};

/** A recipe with its ingredients in insertion order. Nutrients are never stored: see recipeNutrition. */
export type Recipe = {
  id: number;
  name: string;
  servings: number;
  notes: string | null;
  items: RecipeIngredient[];
};

export type RecipeFieldName = "name" | "servings" | "notes" | "items";
export type RecipeFieldErrors = Partial<Record<RecipeFieldName, string>>;

/** useActionState state for the create / edit recipe form. */
export type RecipeFormState = {
  status: "idle" | "error" | "saved";
  fieldErrors: RecipeFieldErrors;
  /** Grams errors by ingredient index (form order). */
  itemErrors: Record<number, string>;
  formError: string | null;
};

export const initialRecipeFormState: RecipeFormState = {
  status: "idle",
  fieldErrors: {},
  itemErrors: {},
  formError: null,
};
