import { addDays, appToday, captureScreen, expect, test } from "./support/fixtures";

test.describe("Progress", () => {
  test("logs a weight and charts it", async ({ page, data }, testInfo) => {
    const today = appToday();
    await data.profile();
    await data.weight(addDays(today, -6), 82.4);

    await page.goto("/progress?range=7");
    await expect(page.getByRole("heading", { name: "Progress", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "7 days" })).toHaveAttribute("aria-current", "page");

    await page.getByRole("button", { name: "Log weight" }).click();
    const sheet = page.getByRole("dialog", { name: "Log weight" });
    await expect(sheet).toBeVisible();
    // Prefilled with the latest weight; the date defaults to today.
    await expect(sheet.getByLabel("Weight (kg)")).toHaveValue("82.4");
    await captureScreen(page, testInfo, "progress-log-weight");
    await sheet.getByLabel("Weight (kg)").fill("81,6");
    await sheet.getByRole("button", { name: "Save weight" }).click();
    await expect(sheet).toBeHidden();

    const log = page.getByRole("list", { name: "Weight entries" });
    await expect(log.getByRole("listitem")).toHaveCount(2);
    await expect(log.getByRole("listitem").first()).toContainText("81.6 kg");
    await expect(log.getByRole("listitem").first()).toContainText("-0.8 kg vs previous");

    const chart = page.getByRole("img", { name: /Weight chart: 2 entries in the last 7 days/ });
    await expect(chart).toBeVisible();
    await expect(chart.locator("svg path")).toHaveCount(2);
    await expect(page.getByText("Change").locator("..")).toContainText("-0.8 kg");
    await expect.poll(() => data.count("weight_entries")).toBe(2);

    await captureScreen(page, testInfo, "progress");
  });

  test("edits and deletes a weight entry", async ({ page, data }) => {
    const today = appToday();
    await data.weight(addDays(today, -2), 75);

    await page.goto("/progress");
    const log = page.getByRole("list", { name: "Weight entries" });
    await log.getByRole("button").first().click();

    const sheet = page.getByRole("dialog", { name: "Edit weight" });
    await sheet.getByLabel("Weight (kg)").fill("74.2");
    await sheet.getByRole("button", { name: "Save changes" }).click();
    await expect(sheet).toBeHidden();
    await expect(log).toContainText("74.2 kg");

    await log.getByRole("button").first().click();
    await sheet.getByRole("button", { name: "Delete entry" }).click();
    await sheet.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText("Entries you log appear here.")).toBeVisible();
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
    const days = page.getByRole("list", { name: "Daily balance by day" });
    await expect(days.getByRole("listitem")).toHaveCount(2);
    await expect(days.getByRole("listitem").first()).toContainText("Over target");
    await expect(days.getByRole("listitem").nth(1)).toContainText("Under target");
    await expect(days.getByRole("listitem").nth(1)).toContainText("Exercise 300");
    await expect(page.getByRole("img", { name: "Daily balance chart: 1 day under target, 1 over target." })).toBeVisible();

    await captureScreen(page, testInfo, "progress-calories");
  });
});
