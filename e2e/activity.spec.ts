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
});
