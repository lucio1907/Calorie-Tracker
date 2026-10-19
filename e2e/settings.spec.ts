import type { Page } from "@playwright/test";
import { appToday, captureScreen, expect, test } from "./support/fixtures";

/** Picks `option` in the custom Select labelled `label` (a button opening a listbox). */
async function choose(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(label) }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(page.getByRole("listbox")).toBeHidden();
}

/** Types MM DD YYYY into the DatePicker segments labelled `label`. */
async function typeDate(page: Page, label: string, mmddyyyy: string): Promise<void> {
  const group = page.getByRole("group", { name: label });
  await group.getByRole("spinbutton", { name: /month/i }).click();
  await page.keyboard.type(mmddyyyy);
}

test.describe("Settings", () => {
  test("saves the profile and today's weight, and Today shows a target", async ({ page, data }, testInfo) => {
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
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved. Today now uses these values.")).toBeVisible();
    await captureScreen(page, testInfo, "settings");

    await expect.poll(() => data.count("weight_entries")).toBe(1);

    await page.goto("/today");
    await expect(page.getByRole("heading", { name: "Remaining" })).toBeVisible();
    await expect(page.getByText("− Lose 0.25 kg/week")).toBeVisible();
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
