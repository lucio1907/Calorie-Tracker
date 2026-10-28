import type { Page } from "@playwright/test";
import { appToday, captureScreen, chooseOption as choose, expect, test } from "./support/fixtures";

/** Types DD MM YYYY (es-AR segment order) into the DatePicker segments labelled `label`. */
async function typeDate(page: Page, label: string, ddmmyyyy: string): Promise<void> {
  const group = page.getByRole("group", { name: label });
  await group.getByRole("spinbutton", { name: /día/i }).click();
  await page.keyboard.type(ddmmyyyy);
}

test.describe("Settings", () => {
  test("saves the profile, macro settings and today's weight, and Today uses them", async ({ page, data }, testInfo) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Ajustes", level: 1 })).toBeVisible();

    await page.getByLabel("Peso actual (kg)").fill("78,5");
    await page.getByRole("button", { name: "Registrar peso" }).click();
    await expect(page.getByText("Peso guardado.")).toBeVisible();
    await expect(page.getByText("Último: 78,5 kg (hoy)")).toBeVisible();
    // The field keeps the latest weight instead of going blank, also after a reload.
    await expect(page.getByLabel("Peso actual (kg)")).toHaveValue("78,5");
    await page.reload();
    await expect(page.getByLabel("Peso actual (kg)")).toHaveValue("78,5");

    await choose(page, "Sexo", "Femenino");
    await typeDate(page, "Fecha de nacimiento", "14031992");
    await page.getByLabel("Altura (cm)").fill("165");
    await choose(page, "Nivel de actividad", "Ligero (1–3 días por semana)");
    await choose(page, "Meta de peso", "Bajar de peso");
    await page.getByLabel("Ritmo (kg por semana)").fill("0,25");

    // Protein by body weight: 78.5 kg x 2 = 157 g, previewed while typing.
    await expect(page.getByLabel("Proteínas (g por kg)")).toHaveValue("1,8");
    await page.getByLabel("Proteínas (g por kg)").fill("2");
    await page.getByLabel("Carbohidratos (%)").fill("55");
    await page.getByLabel("Grasas (%)").fill("45");
    await expect(page.getByText("Total: 100%")).toBeVisible();
    await expect(page.getByText(/^Con 78,5 kg y \d+ kcal: 157 g de proteínas, \d+ g de carbohidratos, \d+ g de grasas\.$/)).toBeVisible();
    await page.getByRole("button", { name: "Guardar perfil" }).click();
    await expect(page.getByText("Perfil guardado. Hoy ya usa estos valores.")).toBeVisible();
    await captureScreen(page, testInfo, "settings");

    // The form keeps what was just saved, so saving again needs nothing re-entered.
    await expect(page.getByRole("button", { name: /Sexo/ })).toContainText("Femenino");
    await expect(page.getByRole("button", { name: /Nivel de actividad/ })).toContainText("Ligero");
    await expect(page.getByRole("button", { name: /Meta de peso/ })).toContainText("Bajar de peso");
    await expect(page.getByRole("group", { name: "Fecha de nacimiento" })).toContainText("14/3/1992");
    await page.getByRole("button", { name: "Guardar perfil" }).click();
    await expect(page.getByText("Perfil guardado. Hoy ya usa estos valores.")).toBeVisible();
    await expect(page.getByText("Obligatorio")).toHaveCount(0);

    await expect.poll(() => data.count("weight_entries")).toBe(1);
    await expect.poll(() => data.macroSettings()).toEqual({ protein_g_per_kg: 2, carbs_share_pct: 55, fat_share_pct: 45 });

    // Reloaded, the form shows what was stored.
    await page.reload();
    await expect(page.getByLabel("Proteínas (g por kg)")).toHaveValue("2");
    await expect(page.getByLabel("Carbohidratos (%)")).toHaveValue("55");
    await expect(page.getByLabel("Grasas (%)")).toHaveValue("45");

    await page.goto("/today");
    await expect(page.getByRole("heading", { name: "Te queda por comer hoy" })).toBeVisible();
    await expect(page.getByText("− Bajar 0,25 kg/semana")).toBeVisible();
    const macros = page.getByRole("region", { name: "Macros" });
    await expect(macros.getByText("Proteínas", { exact: true }).locator("..")).toContainText("0 / 157 g");
  });

  test("refuses a protein setting outside 0.8-3.0 g/kg", async ({ page }) => {
    await page.goto("/settings");
    await page.getByLabel("Proteínas (g por kg)").fill("3,5");
    await page.getByRole("button", { name: "Guardar perfil" }).click();

    await expect(page.getByText("Ingresá de 0,8 a 3 g por kg, con un decimal como máximo.")).toBeVisible();
    await expect(page.getByLabel("Proteínas (g por kg)")).toHaveAttribute("aria-invalid", "true");
  });

  test("refuses a birth date under 18", async ({ page }, testInfo) => {
    const today = appToday();
    const year = Number(today.slice(0, 4)) - 10;

    await page.goto("/settings");
    await choose(page, "Sexo", "Masculino");
    await typeDate(page, "Fecha de nacimiento", `0101${year}`);
    await page.getByLabel("Altura (cm)").fill("150");
    await choose(page, "Nivel de actividad", "Moderado (3–5 días por semana)");
    await page.getByRole("button", { name: "Guardar perfil" }).click();

    await expect(page.locator("form").getByRole("alert")).toHaveText("Revisá los campos marcados.");
    await expect(page.getByText("Tenés que tener al menos 18 años.")).toBeVisible();
    await expect(page.getByText("Perfil guardado. Hoy ya usa estos valores.")).toHaveCount(0);
    await captureScreen(page, testInfo, "settings-under-18");
  });
});
