import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Recipe } from "../lib/types";

/*
 * Server-only reads for recipes. Queries run with the caller's session, so
 * RLS limits recipes to the caller's own and embeds each ingredient's food
 * only while it is visible (own + shared catalog); a hidden food comes back
 * as null. The user_id filter is there for the index.
 */

const RECIPE_COLUMNS =
  "id, name, servings, notes, recipe_items (id, food_id, grams, position, foods (name, brand, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g))";

type IngredientRow = {
  id: number;
  food_id: number;
  grams: number;
  position: number;
  foods: {
    name: string;
    brand: string | null;
    kcal_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
  } | null;
};

type RecipeRow = { id: number; name: string; servings: number; notes: string | null; recipe_items: IngredientRow[] };

function toRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    servings: Number(row.servings),
    notes: row.notes,
    items: [...row.recipe_items]
      .sort((a, b) => a.position - b.position || a.id - b.id)
      .map((item) => ({
        id: item.id,
        foodId: item.food_id,
        grams: Number(item.grams),
        food: item.foods
          ? {
              name: item.foods.name,
              brand: item.foods.brand,
              kcal: Number(item.foods.kcal_per_100g),
              protein: Number(item.foods.protein_per_100g),
              carbs: Number(item.foods.carbs_per_100g),
              fat: Number(item.foods.fat_per_100g),
            }
          : null,
      })),
  };
}

/** The caller's recipes with their ingredients, by name. */
export async function getRecipes(userId: string): Promise<Recipe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_COLUMNS)
    .eq("user_id", userId)
    .order("name", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(`recipes: ${error.message}`);
  return (data as RecipeRow[]).map(toRecipe);
}

/** One of the caller's recipes with its ingredients, or null. */
export async function getRecipe(recipeId: number, userId: string): Promise<Recipe | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_COLUMNS)
    .eq("id", recipeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`recipe ${recipeId}: ${error.message}`);
  return data ? toRecipe(data as RecipeRow) : null;
}
