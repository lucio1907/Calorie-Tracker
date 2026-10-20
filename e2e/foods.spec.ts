import { captureScreen, expect, test } from "./support/fixtures";

test.describe("Foods", () => {
  test("searches the user's foods and opens one", async ({ page, data }, testInfo) => {
    await data.food("E2E Banana", { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 });
    await data.food("E2E Yogurt", { kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 });

    await page.goto("/foods");
    await expect(page.getByRole("heading", { name: "Foods", level: 1 })).toBeVisible();

    await page.getByLabel("Search foods").fill("E2E Banana");
    const results = page.getByRole("region", { name: "Results" });
    await expect(results.getByRole("button", { name: /E2E Banana/ })).toBeVisible();
    await expect(results.getByRole("button", { name: /E2E Yogurt/ })).toHaveCount(0);
    await captureScreen(page, testInfo, "foods");

    await results.getByRole("button", { name: /E2E Banana/ }).click();
    const detail = page.getByRole("dialog", { name: "E2E Banana" });
    await expect(detail.getByText("Nutrients per 100 g")).toBeVisible();
    await expect(detail).toContainText("89");
  });

  test("creates a custom food", async ({ page }, testInfo) => {
    await page.goto("/foods");
    await page.getByRole("button", { name: "New food" }).click();

    const sheet = page.getByRole("dialog", { name: "New food" });
    await sheet.getByLabel("Name").fill("E2E Granola");
    await sheet.getByLabel("Energy (kcal)").fill("450");
    await sheet.getByLabel("Protein (g)").fill("10");
    await sheet.getByLabel("Carbohydrates (g)").fill("60");
    await sheet.getByLabel("Fat (g)").fill("18");
    await captureScreen(page, testInfo, "foods-new");
    await sheet.getByRole("button", { name: "Save food" }).click();

    await page.getByLabel("Search foods").fill("E2E Granola");
    await expect(page.getByRole("region", { name: "Results" }).getByRole("button", { name: /E2E Granola/ })).toBeVisible();
  });

  test("validates the custom food form", async ({ page }) => {
    await page.goto("/foods");
    await page.getByRole("button", { name: "New food" }).click();
    const sheet = page.getByRole("dialog", { name: "New food" });
    await sheet.getByRole("button", { name: "Save food" }).click();

    await expect(sheet.getByText("Check the highlighted fields.")).toBeVisible();
  });
});
