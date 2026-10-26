"use client";

import { useActionState, useRef, useState } from "react";
import { FoodResults } from "@/features/foods/components/food-results";
import { FoodSearchBar } from "@/features/foods/components/food-search-bar";
import { useFoodSearch } from "@/features/foods/hooks/use-food-search";
import { toDecimal } from "@/features/foods/lib/food-schema";
import type { FoodSummary } from "@/features/foods/lib/types";
import { createRecipe, updateRecipe } from "../actions/recipe-actions";
import { RecipeForm, type IngredientDraft } from "../components/recipe-form";
import { recipeNutrition, type RecipeNutrition } from "../lib/recipe-nutrition";
import { initialRecipeFormState, type IngredientFood, type Recipe, type RecipeFormState } from "../lib/types";

type RecipeFormContainerProps = {
  /** The recipe being edited; omitted when creating. */
  recipe?: Recipe;
  /** Server-rendered food results for an empty query. */
  initialFoods: FoodSummary[];
  onSaved: () => void;
  onCancel: () => void;
};

/** Catalog search (own + shared foods) for adding an ingredient. */
function IngredientPicker({ initialFoods, onPick }: { initialFoods: FoodSummary[]; onPick: (food: FoodSummary) => void }) {
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { foods, status, reload } = useFoodSearch(query, favoritesOnly, initialFoods);
  return (
    <div className="flex flex-col gap-12 rounded-cards border border-border p-12">
      <FoodSearchBar
        query={query}
        onQueryChange={setQuery}
        favoritesOnly={favoritesOnly}
        onFavoritesOnlyChange={setFavoritesOnly}
      />
      <FoodResults
        foods={foods}
        status={status}
        query={query}
        favoritesOnly={favoritesOnly}
        onSelect={onPick}
        onRetry={reload}
      />
    </div>
  );
}

/** Live per-serving values for what is typed, or null while something is missing or invalid. */
function liveSummary(servingsText: string, ingredients: IngredientDraft[], foods: Map<number, IngredientFood | null>) {
  const servings = toDecimal(servingsText);
  if (typeof servings !== "number" || !(servings > 0)) return null;
  const items = [];
  for (const ingredient of ingredients) {
    const grams = toDecimal(ingredient.grams);
    if (typeof grams !== "number" || !(grams > 0)) return null;
    items.push({ id: 0, foodId: ingredient.foodId, grams, food: foods.get(ingredient.foodId) ?? null });
  }
  const result = recipeNutrition({ servings, items });
  return result.ok ? result.value : null;
}

/** Wires RecipeForm to the createRecipe / updateRecipe Server Actions and the ingredient search. */
export function RecipeFormContainer({ recipe, initialFoods, onSaved, onCancel }: RecipeFormContainerProps) {
  const [state, formAction, pending] = useActionState(async (previous: RecipeFormState, formData: FormData) => {
    const next = await (recipe ? updateRecipe(previous, formData) : createRecipe(previous, formData));
    if (next.status === "saved") onSaved();
    return next;
  }, initialRecipeFormState);

  const [servings, setServings] = useState(recipe ? String(recipe.servings) : "1");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    () =>
      recipe?.items.map((item) => ({
        key: `item-${item.id}`,
        foodId: item.foodId,
        name: item.food?.name ?? null,
        grams: String(item.grams),
      })) ?? [],
  );
  // Per-100 g values of every food on the form, for the live summary.
  const [foods, setFoods] = useState(
    () => new Map<number, IngredientFood | null>(recipe?.items.map((item) => [item.foodId, item.food]) ?? []),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const nextKey = useRef(0);

  function addIngredient(food: FoodSummary) {
    const { name, brand, kcal, protein, carbs, fat } = food;
    setFoods((current) => new Map(current).set(food.id, { name, brand, kcal, protein, carbs, fat }));
    nextKey.current += 1;
    setIngredients((current) => [
      ...current,
      { key: `new-${nextKey.current}`, foodId: food.id, name, grams: "100" },
    ]);
    setPickerOpen(false);
  }

  const summary: RecipeNutrition | null = liveSummary(servings, ingredients, foods);

  return (
    <RecipeForm
      recipeId={recipe?.id}
      defaults={{ name: recipe?.name ?? "", notes: recipe?.notes ?? "" }}
      servings={servings}
      onServingsChange={setServings}
      ingredients={ingredients}
      onGramsChange={(key, grams) =>
        setIngredients((current) => current.map((item) => (item.key === key ? { ...item, grams } : item)))
      }
      onRemove={(key) => setIngredients((current) => current.filter((item) => item.key !== key))}
      picker={pickerOpen ? <IngredientPicker initialFoods={initialFoods} onPick={addIngredient} /> : null}
      onTogglePicker={() => setPickerOpen((open) => !open)}
      pickerOpen={pickerOpen}
      summary={summary}
      state={state}
      action={formAction}
      pending={pending}
      onCancel={onCancel}
    />
  );
}
