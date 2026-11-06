import { addDays, appToday, captureScreen, expect, test } from "./support/fixtures";

test.describe("Activity", () => {
  test("asks for a weight before logging", async ({ page }) => {
    await page.goto("/activity");

    await expect(page.getByText("Registrá tu peso para calcular las calorías que queman tus actividades.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrar actividad" })).toHaveCount(0);
  });

  test("logs an activity with MET-based calories", async ({ page, data }, testInfo) => {
    await data.weight(addDays(appToday(), -3), 70);

    await page.goto("/activity");
    await expect(page.getByText(/Las calorías usan tu peso de 70 kg/)).toBeVisible();

    await page.getByRole("button", { name: "Registrar actividad" }).click();
    const sheet = page.getByRole("dialog", { name: "Registrar actividad" });
    await sheet.getByLabel("Buscar actividades").fill("Correr, 10");
    await sheet.getByRole("button", { name: /Correr, 10 km\/h/ }).click();

    // (MET 9.3 - 1) x 70 kg x 0.5 h = 290.5 kcal.
    await sheet.getByLabel("Duración (minutos)").fill("30");
    await expect(sheet.getByText("291", { exact: true })).toBeVisible();
    await sheet.getByRole("button", { name: "Agregar actividad" }).click();
    await expect(sheet).toBeHidden();

    const entries = page.getByRole("list", { name: "Actividades registradas" });
    await expect(entries.getByRole("listitem")).toHaveCount(1);
    await expect(entries).toContainText("Correr, 10 km/h");
    await expect(page.getByRole("region", { name: "Total de ejercicio" })).toContainText("291");
    await expect.poll(() => data.count("activity_entries")).toBe(1);
    await captureScreen(page, testInfo, "activity");
  });

  test("logs the calories from a watch and keeps them when the duration changes", async ({ page, data }) => {
    await data.weight(addDays(appToday(), -3), 70);

    await page.goto("/activity");
    await page.getByRole("button", { name: "Registrar actividad" }).click();
    const sheet = page.getByRole("dialog", { name: "Registrar actividad" });
    await sheet.getByLabel("Buscar actividades").fill("Correr, 10");
    await sheet.getByRole("button", { name: /Correr, 10 km\/h/ }).click();

    await sheet.getByLabel("Duración (minutos)").fill("30");
    await sheet.getByLabel("Calorías de tu reloj (opcional)").fill("1200");
    await expect(sheet.getByText("291", { exact: true })).toHaveCount(0);
    await sheet.getByRole("button", { name: "Agregar actividad" }).click();
    await expect(sheet).toBeHidden();

    const total = page.getByRole("region", { name: "Total de ejercicio" });
    await expect(total).toContainText("1200");

    const entries = page.getByRole("list", { name: "Actividades registradas" });
    await entries.getByRole("button", { name: /Correr, 10 km\/h/ }).click();
    const editor = page.getByRole("dialog", { name: "Editar actividad" });
    await expect(editor.getByLabel("Calorías de tu reloj (opcional)")).toHaveValue("1200");
    await editor.getByLabel("Duración (minutos)").fill("60");
    await editor.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(editor).toBeHidden();
    await expect(entries).toContainText("60 min");
    await expect(total).toContainText("1200");

    // Clearing the field goes back to the MET estimate: (9.3 - 1) x 70 kg x 1 h = 581.
    await entries.getByRole("button", { name: /Correr, 10 km\/h/ }).click();
    await editor.getByLabel("Calorías de tu reloj (opcional)").fill("");
    await editor.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(editor).toBeHidden();
    await expect(total).toContainText("581");
  });
});
