import { describe, expect, it } from "vitest";
import { nutrientSnapshot } from "@/domain";
import { recipeNutrition } from "./recipe-nutrition";
import type { IngredientFood, RecipeIngredient } from "./types";

const rice: IngredientFood = { name: "Rice", brand: null, kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 };
const chicken: IngredientFood = { name: "Chicken", brand: null, kcal: 165, protein: 31, carbs: 0, fat: 3.6 };

function item(food: IngredientFood | null, grams: number, id = 1): RecipeIngredient {
  return { id, foodId: id, grams, food };
}

describe("recipeNutrition", () => {
  const items = [item(rice, 300, 1), item(chicken, 200, 2)];

  it("derives per-100 g and per-serving values from the ingredients", () => {
    // Total: 390 + 330 = 720 kcal in 500 g.
    expect(recipeNutrition({ servings: 2, items })).toEqual({
      ok: true,
      value: {
        totalGrams: 500,
        servingGrams: 250,
        per100g: { kcal: 144, protein: 14.02, carbs: 16.8, fat: 1.62 },
        perServing: { kcal: 360, protein: 35.05, carbs: 42, fat: 4.05 },
      },
    });
  });

  it("rounds serving grams and values half up to 2 decimals", () => {
    const result = recipeNutrition({ servings: 3, items });
    // 500 g / 3 = 166.666… -> 166.67 g; protein 14.02 x 1.6667 = 23.367… -> 23.37.
    expect(result).toMatchObject({
      ok: true,
      value: { servingGrams: 166.67, perServing: { kcal: 240, protein: 23.37, carbs: 28, fat: 2.7 } },
    });
  });

  it("rounds per-100 g values to the database precision", () => {
    // 75 kcal in 70 g = 107.142… kcal per 100 g.
    const lean = { ...rice, kcal: 250 };
    const water = { ...rice, kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const result = recipeNutrition({ servings: 1, items: [item(lean, 30, 1), item(water, 40, 2)] });
    expect(result.ok && result.value.per100g.kcal).toBe(107.14);
  });

  it("makes one serving log exactly what a food with the same per-100 g values logs", () => {
    const result = recipeNutrition({ servings: 2, items });
    if (!result.ok) throw new Error("expected nutrition");
    expect(nutrientSnapshot(result.value.per100g, result.value.servingGrams)).toEqual(result.value.perServing);
  });

  it("handles ingredients heavier than one diary entry", () => {
    const result = recipeNutrition({ servings: 4, items: [item(rice, 8000)] });
    expect(result).toMatchObject({ ok: true, value: { totalGrams: 8000, servingGrams: 2000, perServing: { kcal: 2600 } } });
  });

  it("reports a recipe without ingredients", () => {
    expect(recipeNutrition({ servings: 1, items: [] })).toEqual({ ok: false, error: "empty" });
  });

  it("reports an ingredient whose food is no longer visible", () => {
    expect(recipeNutrition({ servings: 1, items: [item(rice, 100, 1), item(null, 50, 2)] })).toEqual({
      ok: false,
      error: "missing_food",
    });
  });
});
