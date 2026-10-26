import type { Locator, Page } from "@playwright/test";
import { captureScreen, expect, test } from "./support/fixtures";

/** Adds `food` to the open recipe form with `grams`. */
async function addIngredient(sheet: Locator, food: string, grams: string): Promise<void> {
  await sheet.getByRole("button", { name: "Add ingredient" }).click();
  await sheet.getByLabel("Search foods").fill(food);
  await sheet.getByRole("region", { name: "Results" }).getByRole("button", { name: new RegExp(food) }).click();
  await sheet.getByRole("textbox", { name: `Grams of ${food}` }).fill(grams);
}

function dinner(page: Page): Locator {
  return page.getByRole("list", { name: "Dinner entries" });
}

test.describe("Recipes", () => {
  test("creates a recipe, logs servings and keeps the entry through edits and deletion", async ({ page, data }, testInfo) => {
    await data.food("E2E Rice", { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 });
    await data.food("E2E Chicken", { kcal: 165, protein: 31, carbs: 0, fat: 3.6 });

    // Create: 300 g rice + 200 g chicken, 2 servings = 720 kcal / 2 = 360 kcal per serving.
    await page.goto("/foods");
    await page.getByRole("link", { name: "Recipes" }).click();
    await expect(page.getByRole("heading", { name: "Recipes", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "New recipe" }).click();

    const createSheet = page.getByRole("dialog", { name: "New recipe" });
    await createSheet.getByRole("textbox", { name: "Name", exact: true }).fill("E2E Rice bowl");
    await createSheet.getByRole("textbox", { name: "Servings", exact: true }).fill("2");
    await addIngredient(createSheet, "E2E Rice", "300");
    await addIngredient(createSheet, "E2E Chicken", "200");
    await expect(createSheet.getByRole("status")).toContainText("360");
    await createSheet.getByRole("button", { name: "Save recipe" }).click();
    await expect(createSheet).toBeHidden();

    const recipes = page.getByRole("region", { name: "Your recipes" });
    const row = recipes.getByRole("button", { name: /E2E Rice bowl/ });
    await expect(row).toContainText("2 servings · 500 g in total");
    await expect(row).toContainText("360");
    await expect(row).toContainText("C 42");
    await captureScreen(page, testInfo, "recipes");

    // Log 1.5 servings = 375 g = 540 kcal.
    await page.goto("/diary");
    await page.getByRole("button", { name: "Add food to Dinner" }).click();
    const addSheet = page.getByRole("dialog", { name: "Add to Dinner" });
    const recipeOption = addSheet.getByRole("region", { name: "Recipes" }).getByRole("button", { name: /E2E Rice bowl/ });
    await expect(recipeOption).toContainText("Recipe");
    await recipeOption.click();
    await addSheet.getByRole("textbox", { name: "Quantity" }).fill("1.5");
    await expect(addSheet.getByRole("status")).toContainText("540");
    await addSheet.getByRole("button", { name: "Add to diary" }).click();
    await expect(addSheet).toBeHidden();

    await expect(dinner(page)).toContainText("E2E Rice bowl");
    await expect(dinner(page)).toContainText("1.5 × 1 serving · 375 g");
    await expect(dinner(page)).toContainText("540");
    await expect(page.getByRole("region", { name: "Day total" })).toContainText("540");

    // Edit the recipe: 400 g rice. New servings are 425 kcal; the logged entry keeps 540.
    await page.goto("/foods/recipes");
    await recipes.getByRole("button", { name: /E2E Rice bowl/ }).click();
    const editSheet = page.getByRole("dialog", { name: "Edit recipe" });
    await editSheet.getByRole("textbox", { name: "Grams of E2E Rice" }).fill("400");
    await editSheet.getByRole("button", { name: "Save recipe" }).click();
    await expect(editSheet).toBeHidden();
    await expect(row).toContainText("425");

    await page.goto("/diary");
    await expect(dinner(page)).toContainText("540");
    await expect(page.getByRole("region", { name: "Day total" })).toContainText("540");

    // Delete the recipe: the entry stays with its snapshot.
    await page.goto("/foods/recipes");
    await recipes.getByRole("button", { name: /E2E Rice bowl/ }).click();
    await editSheet.getByRole("button", { name: "Delete recipe" }).click();
    await editSheet.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(editSheet).toBeHidden();
    await expect(page.getByText("No recipes yet.", { exact: false })).toBeVisible();

    await page.goto("/diary");
    await expect(dinner(page)).toContainText("E2E Rice bowl");
    await expect(dinner(page)).toContainText("540");
    await expect.poll(() => data.count("food_entries")).toBe(1);
  });
});
