import { captureScreen, expect, test } from "./support/fixtures";

test.describe("Foods", () => {
  test("searches the user's foods and opens one", async ({ page, data }, testInfo) => {
    await data.food("E2E Banana", { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 });
    await data.food("E2E Yogurt", { kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 });

    await page.goto("/foods");
    await expect(page.getByRole("heading", { name: "Alimentos", level: 1 })).toBeVisible();

    await page.getByLabel("Buscar alimentos").fill("E2E Banana");
    const results = page.getByRole("region", { name: "Resultados" });
    await expect(results.getByRole("button", { name: /E2E Banana/ })).toBeVisible();
    await expect(results.getByRole("button", { name: /E2E Yogurt/ })).toHaveCount(0);
    await captureScreen(page, testInfo, "foods");

    await results.getByRole("button", { name: /E2E Banana/ }).click();
    const detail = page.getByRole("dialog", { name: "E2E Banana" });
    await expect(detail.getByText("Nutrientes cada 100 g")).toBeVisible();
    await expect(detail).toContainText("89");
  });

  test("pages through the results 20 at a time", async ({ page, data }) => {
    // 21 matches: "E2E Paged 01" .. "E2E Paged 21".
    await Promise.all(
      Array.from({ length: 21 }, (_, index) => data.food(`E2E Paged ${String(index + 1).padStart(2, "0")}`, { kcal: 100 })),
    );

    await page.goto("/foods");
    await page.getByLabel("Buscar alimentos").fill("E2E Paged");
    const results = page.getByRole("region", { name: "Resultados" });
    const pagination = page.getByRole("navigation", { name: "Páginas de resultados" });
    await expect(results.getByRole("button", { name: /E2E Paged/ })).toHaveCount(20);
    await expect(pagination).toContainText("Página 1");
    await expect(pagination.getByRole("button", { name: "Anterior" })).toBeDisabled();

    await pagination.getByRole("button", { name: "Siguiente" }).click();
    await expect(pagination).toContainText("Página 2");
    await expect(results.getByRole("button", { name: /E2E Paged/ })).toHaveCount(1);
    await expect(results.getByRole("button", { name: /E2E Paged 21/ })).toBeVisible();
    await expect(pagination.getByRole("button", { name: "Siguiente" })).toBeDisabled();

    // A new search starts over from the first page.
    await page.getByLabel("Buscar alimentos").fill("E2E Paged 2");
    await expect(results.getByRole("button", { name: /E2E Paged/ })).toHaveCount(2);
    await expect(pagination).toHaveCount(0);
  });

  test("creates a custom food", async ({ page }, testInfo) => {
    await page.goto("/foods");
    await page.getByRole("button", { name: "Nuevo alimento" }).click();

    const sheet = page.getByRole("dialog", { name: "Nuevo alimento" });
    await sheet.getByLabel("Nombre").fill("E2E Granola");
    await sheet.getByLabel("Energía (kcal)").fill("450");
    await sheet.getByLabel("Proteínas (g)").fill("10");
    await sheet.getByLabel("Carbohidratos (g)").fill("60");
    await sheet.getByLabel("Grasas (g)").fill("18");
    await captureScreen(page, testInfo, "foods-new");
    await sheet.getByRole("button", { name: "Guardar alimento" }).click();

    await page.getByLabel("Buscar alimentos").fill("E2E Granola");
    await expect(page.getByRole("region", { name: "Resultados" }).getByRole("button", { name: /E2E Granola/ })).toBeVisible();
  });

  test("validates the custom food form", async ({ page }) => {
    await page.goto("/foods");
    await page.getByRole("button", { name: "Nuevo alimento" }).click();
    const sheet = page.getByRole("dialog", { name: "Nuevo alimento" });
    await sheet.getByRole("button", { name: "Guardar alimento" }).click();

    await expect(sheet.getByText("Revisá los campos marcados.")).toBeVisible();
  });
});
