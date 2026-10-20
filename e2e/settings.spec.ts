import type { Page } from "@playwright/test";
import { appToday, captureScreen, chooseOption as choose, expect, test } from "./support/fixtures";

/** Types MM DD YYYY into the DatePicker segments labelled `label`. */
async function typeDate(page: Page, label: string, mmddyyyy: string): Promise<void> {
  const group = page.getByRole("group", { name: label });
  await group.getByRole("spinbutton", { name: /month/i }).click();
  await page.keyboard.type(mmddyyyy);
}

test.describe("Settings", () => {
  test("saves the profile, macro settings and today's weight, and Today uses them", async ({ page, data }, testInfo) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();

    await page.getByLabel("Current weight (kg)").fill("78.5");
    await page.getByRole("button", { name: "Log weight" }).click();
    await expect(page.getByText("Weight saved.")).toBeVisible();
    await expect(page.getByText("Latest: 78.5 kg (today)")).toBeVisible();

    await choose(page, "Sex", "Female");
    await typeDate(page, "Birth date", "03141992");
    await page.getByLabel("Height (cm)").fill("165");
    await choose(page, "Activity level", "Light (1–3 days a week)");
    await choose(page, "Weight goal", "Lose weight");
    await page.getByLabel("Rate (kg per week)").fill("0.25");

    // Protein by body weight: 78.5 kg x 2 = 157 g, previewed while typing.
    await expect(page.getByLabel("Protein (g per kg)")).toHaveValue("1.8");
    await page.getByLabel("Protein (g per kg)").fill("2");
    await page.getByLabel("Carbs (%)").fill("55");
    await page.getByLabel("Fat (%)").fill("45");
    await expect(page.getByText("Total: 100%")).toBeVisible();
    await expect(page.getByText(/^At 78\.5 kg and \d+ kcal: 157 g protein, \d+ g carbs, \d+ g fat\.$/)).toBeVisible();
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved. Today now uses these values.")).toBeVisible();
    await captureScreen(page, testInfo, "settings");

    // The form keeps what was just saved, so saving again needs nothing re-entered.
    await expect(page.getByRole("button", { name: /Sex/ })).toContainText("Female");
    await expect(page.getByRole("button", { name: /Activity level/ })).toContainText("Light");
    await expect(page.getByRole("button", { name: /Weight goal/ })).toContainText("Lose weight");
    await expect(page.getByRole("group", { name: "Birth date" })).toContainText("3/14/1992");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved. Today now uses these values.")).toBeVisible();
    await expect(page.getByText("Required")).toHaveCount(0);

    await expect.poll(() => data.count("weight_entries")).toBe(1);
    await expect.poll(() => data.macroSettings()).toEqual({ protein_g_per_kg: 2, carbs_share_pct: 55, fat_share_pct: 45 });

    // Reloaded, the form shows what was stored.
    await page.reload();
    await expect(page.getByLabel("Protein (g per kg)")).toHaveValue("2");
    await expect(page.getByLabel("Carbs (%)")).toHaveValue("55");
    await expect(page.getByLabel("Fat (%)")).toHaveValue("45");

    await page.goto("/today");
    await expect(page.getByRole("heading", { name: "Remaining" })).toBeVisible();
    await expect(page.getByText("− Lose 0.25 kg/week")).toBeVisible();
    const macros = page.getByRole("region", { name: "Macros" });
    await expect(macros.getByText("Protein", { exact: true }).locator("..")).toContainText("0 / 157 g");
  });

  test("refuses a protein setting outside 0.8-3.0 g/kg", async ({ page }) => {
    await page.goto("/settings");
    await page.getByLabel("Protein (g per kg)").fill("3.5");
    await page.getByRole("button", { name: "Save profile" }).click();

    await expect(page.getByText("Enter 0.8 to 3 g per kg, with at most one decimal.")).toBeVisible();
    await expect(page.getByLabel("Protein (g per kg)")).toHaveAttribute("aria-invalid", "true");
  });

  test("refuses a birth date under 18", async ({ page }, testInfo) => {
    const today = appToday();
    const year = Number(today.slice(0, 4)) - 10;

    await page.goto("/settings");
    await choose(page, "Sex", "Male");
    await typeDate(page, "Birth date", `0101${year}`);
    await page.getByLabel("Height (cm)").fill("150");
    await choose(page, "Activity level", "Moderate (3–5 days a week)");
    await page.getByRole("button", { name: "Save profile" }).click();

    await expect(page.locator("form").getByRole("alert")).toHaveText("Check the highlighted fields.");
    await expect(page.getByText("You must be at least 18 years old.")).toBeVisible();
    await expect(page.getByText("Profile saved. Today now uses these values.")).toHaveCount(0);
    await captureScreen(page, testInfo, "settings-under-18");
  });
});
