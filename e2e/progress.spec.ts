import type { Locator } from "@playwright/test";
import { addDays, appToday, captureScreen, chooseOption, expect, test } from "./support/fixtures";

/** The "Objetivo N" kcal shown in a day row of the balance list. */
async function targetIn(row: Locator): Promise<number> {
  const match = /Objetivo ([\d.]+)/.exec(await row.innerText());
  if (!match) throw new Error("day row has no target");
  return Number(match[1].replaceAll(".", ""));
}

test.describe("Progress", () => {
  test("logs a weight and charts it", async ({ page, data }, testInfo) => {
    const today = appToday();
    await data.profile();
    await data.weight(addDays(today, -6), 82.4);

    await page.goto("/progress?range=7");
    await expect(page.getByRole("heading", { name: "Progreso", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "7 días" })).toHaveAttribute("aria-current", "page");

    await page.getByRole("button", { name: "Registrar peso" }).click();
    const sheet = page.getByRole("dialog", { name: "Registrar peso" });
    await expect(sheet).toBeVisible();
    // Prefilled with the latest weight; the date defaults to today.
    await expect(sheet.getByLabel("Peso (kg)")).toHaveValue("82,4");
    await captureScreen(page, testInfo, "progress-log-weight");
    await sheet.getByLabel("Peso (kg)").fill("81,6");
    await sheet.getByRole("button", { name: "Guardar peso" }).click();
    await expect(sheet).toBeHidden();

    const log = page.getByRole("list", { name: "Registros de peso" });
    await expect(log.getByRole("listitem")).toHaveCount(2);
    await expect(log.getByRole("listitem").first()).toContainText("81,6 kg");
    await expect(log.getByRole("listitem").first()).toContainText("-0,8 kg vs. el anterior");

    const chart = page.getByRole("img", { name: /Gráfico de peso: 2 registros en los últimos 7 días/ });
    await expect(chart).toBeVisible();
    await expect(chart.locator("svg path")).toHaveCount(2);
    await expect(page.getByText("Cambio").locator("..")).toContainText("-0,8 kg");
    await expect.poll(() => data.count("weight_entries")).toBe(2);

    await captureScreen(page, testInfo, "progress");
  });

  test("shows the AI summary card with its generate button", async ({ page }) => {
    await page.goto("/progress?range=7");

    // Only the card is checked: clicking would call OpenRouter.
    const card = page.getByRole("region", { name: "Resumen con IA" });
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: "Generar resumen" })).toBeEnabled();
  });

  test("edits and deletes a weight entry", async ({ page, data }) => {
    const today = appToday();
    await data.weight(addDays(today, -2), 75);

    await page.goto("/progress");
    const log = page.getByRole("list", { name: "Registros de peso" });
    await log.getByRole("button").first().click();

    const sheet = page.getByRole("dialog", { name: "Editar peso" });
    await sheet.getByLabel("Peso (kg)").fill("74.2");
    await sheet.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(sheet).toBeHidden();
    await expect(log).toContainText("74,2 kg");

    await log.getByRole("button").first().click();
    await sheet.getByRole("button", { name: "Eliminar registro" }).click();
    await sheet.getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText("Los registros que agregues aparecen acá.")).toBeVisible();
    await expect.poll(() => data.count("weight_entries")).toBe(0);
  });

  test("shows the daily calorie balance against the target", async ({ page, data }, testInfo) => {
    const today = appToday();
    await data.profile();
    await data.weight(addDays(today, -10), 80);
    await data.foodEntry({ date: addDays(today, -1), meal: "lunch", label: "Big lunch", grams: 500, kcal: 4500 });
    await data.foodEntry({ date: addDays(today, -2), meal: "lunch", label: "Small lunch", grams: 100, kcal: 900 });
    await data.activityEntry({ date: addDays(today, -2), label: "Run", minutes: 30, kcal: 300 });

    await page.goto("/progress?range=7");
    const days = page.getByRole("list", { name: "Balance diario por día" });
    await expect(days.getByRole("listitem")).toHaveCount(2);
    await expect(days.getByRole("listitem").first()).toContainText("Por encima del objetivo");
    await expect(days.getByRole("listitem").nth(1)).toContainText("Por debajo del objetivo");
    await expect(days.getByRole("listitem").nth(1)).toContainText("Ejercicio 300");
    await expect(page.getByRole("img", { name: "Gráfico de balance diario: 1 día por debajo del objetivo, 1 por encima del objetivo." })).toBeVisible();

    await captureScreen(page, testInfo, "progress-calories");
  });

  test("keeps past days on the target they had when the goal changes", async ({ page, data }) => {
    const today = appToday();
    await data.profile();
    // The maintain profile has been in effect for a month.
    await data.profileEffectiveSince(addDays(today, -30));
    await data.weight(addDays(today, -10), 80);
    await data.foodEntry({ date: addDays(today, -2), meal: "lunch", label: "Past lunch", grams: 300, kcal: 2000 });
    await data.foodEntry({ date: today, meal: "lunch", label: "Today lunch", grams: 300, kcal: 2000 });

    await page.goto("/progress?range=7");
    const days = page.getByRole("list", { name: "Balance diario por día" });
    await expect(days.getByRole("listitem")).toHaveCount(2);
    const pastTarget = await targetIn(days.getByRole("listitem").nth(1));
    expect(await targetIn(days.getByRole("listitem").first())).toBe(pastTarget);

    await page.goto("/settings");
    await chooseOption(page, "Meta de peso", "Bajar de peso");
    await page.getByLabel("Ritmo (kg por semana)").fill("0,5");
    await page.getByRole("button", { name: "Guardar perfil" }).click();
    await expect(page.getByText("Perfil guardado. Hoy ya usa estos valores.")).toBeVisible();

    await page.goto("/progress?range=7");
    await expect(days.getByRole("listitem")).toHaveCount(2);
    // Today follows the new goal; two days ago keeps the maintain target.
    await expect.poll(() => targetIn(days.getByRole("listitem").first())).toBeLessThan(pastTarget);
    expect(await targetIn(days.getByRole("listitem").nth(1))).toBe(pastTarget);
  });
});
