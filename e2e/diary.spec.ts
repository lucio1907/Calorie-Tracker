import { appToday, captureScreen, chooseOption, expect, test } from "./support/fixtures";

test.describe("Diary", () => {
  test("adds, edits and deletes an entry", async ({ page, data }, testInfo) => {
    await data.food("E2E Rice", { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 });

    await page.goto("/diary");
    await expect(page.getByRole("heading", { name: "Diario", level: 1 })).toBeVisible();

    // Add: lunch -> pick the food -> 150 g.
    await page.getByRole("button", { name: "Agregar alimento a Almuerzo" }).click();
    const addSheet = page.getByRole("dialog", { name: "Agregar a Almuerzo" });
    await addSheet.getByLabel("Buscar alimentos").fill("E2E Rice");
    await addSheet.getByRole("button", { name: /E2E Rice/ }).first().click();
    await addSheet.getByRole("textbox", { name: "Gramos" }).fill("150");
    await expect(addSheet.getByText("195", { exact: true })).toBeVisible();
    await addSheet.getByRole("button", { name: "Agregar al diario" }).click();
    await expect(addSheet).toBeHidden();

    const lunch = page.getByRole("list", { name: "Registros de Almuerzo" });
    await expect(lunch.getByRole("listitem")).toHaveCount(1);
    await expect(lunch).toContainText("E2E Rice");
    await expect(lunch).toContainText("195");
    await captureScreen(page, testInfo, "diary");

    // Edit: 200 g.
    await lunch.getByRole("button", { name: /E2E Rice/ }).click();
    const editSheet = page.getByRole("dialog", { name: "Editar registro" });
    await editSheet.getByRole("textbox", { name: "Gramos" }).fill("200");
    await editSheet.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(editSheet).toBeHidden();
    await expect(lunch).toContainText("260");

    // Delete.
    await lunch.getByRole("button", { name: /E2E Rice/ }).click();
    await editSheet.getByRole("button", { name: "Eliminar registro" }).click();
    await editSheet.getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(editSheet).toBeHidden();
    await expect(page.getByRole("list", { name: "Registros de Almuerzo" })).toHaveCount(0);
    await expect.poll(() => data.count("food_entries")).toBe(0);
  });

  test("logs a catalog food by 'unidad' after defining its weight once", async ({ page, data }) => {
    const bread = await data.sharedFood("E2E Pan lactal", { kcal: 270 });
    const lunch = page.getByRole("list", { name: "Registros de Almuerzo" });

    await page.goto("/diary");

    // First time: "unidad" asks for the weight of 1 unit (25 g); 2 units = 50 g.
    await page.getByRole("button", { name: "Agregar alimento a Almuerzo" }).click();
    const addSheet = page.getByRole("dialog", { name: "Agregar a Almuerzo" });
    await addSheet.getByLabel("Buscar alimentos").fill(bread);
    await addSheet.getByRole("button", { name: new RegExp(bread) }).first().click();
    await chooseOption(page, "Unidad", "unidad");
    await addSheet.getByRole("textbox", { name: "Cantidad" }).fill("2");
    await addSheet.getByRole("textbox", { name: "Peso de 1 unidad (g)" }).fill("25");
    await expect(addSheet.getByText("· 50 g")).toBeVisible();
    await addSheet.getByRole("button", { name: "Agregar al diario" }).click();
    await expect(addSheet).toBeHidden();
    await expect(lunch).toContainText("2 × unidad · 50 g");

    // Next time: "unidad (25 g)" is a normal option, with no weight field.
    await page.getByRole("button", { name: "Agregar alimento a Almuerzo" }).click();
    await addSheet.getByLabel("Buscar alimentos").fill(bread);
    await addSheet.getByRole("button", { name: new RegExp(bread) }).first().click();
    await chooseOption(page, "Unidad", "unidad (25 g)");
    await expect(addSheet.getByRole("textbox", { name: "Peso de 1 unidad (g)" })).toHaveCount(0);
    await addSheet.getByRole("textbox", { name: "Cantidad" }).fill("1");
    await addSheet.getByRole("button", { name: "Agregar al diario" }).click();
    await expect(addSheet).toBeHidden();
    await expect(lunch.getByRole("listitem")).toHaveCount(2);
    await expect(lunch).toContainText("1 × unidad · 25 g");
  });

  test("shows only the selected day's entries", async ({ page, data }) => {
    const today = appToday();
    await data.foodEntry({ date: today, meal: "dinner", label: "Today's soup", grams: 300, kcal: 150 });

    await page.goto("/diary?date=2026-01-15");
    await expect(page.getByText("Today's soup")).toHaveCount(0);
    await page.goto("/diary");
    await expect(page.getByRole("list", { name: "Registros de Cena" })).toContainText("Today's soup");
  });
});
