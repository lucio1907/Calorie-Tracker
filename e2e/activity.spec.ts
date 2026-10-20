import { addDays, appToday, captureScreen, expect, test } from "./support/fixtures";

test.describe("Activity", () => {
  test("asks for a weight before logging", async ({ page }) => {
    await page.goto("/activity");

    await expect(page.getByText("Log your weight to calculate the calories your activities burn.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Log activity" })).toHaveCount(0);
  });

  test("logs an activity with MET-based calories", async ({ page, data }, testInfo) => {
    await data.weight(addDays(appToday(), -3), 70);

    await page.goto("/activity");
    await expect(page.getByText(/Calories use your weight of 70 kg/)).toBeVisible();

    await page.getByRole("button", { name: "Log activity" }).click();
    const sheet = page.getByRole("dialog", { name: "Log activity" });
    await sheet.getByLabel("Search activities").fill("Running, 10");
    await sheet.getByRole("button", { name: /Running, 10 km\/h/ }).click();

    // MET 9.3 x 70 kg x 0.5 h = 325.5 kcal.
    await sheet.getByLabel("Duration (minutes)").fill("30");
    await expect(sheet.getByText("326", { exact: true })).toBeVisible();
    await sheet.getByRole("button", { name: "Add activity" }).click();
    await expect(sheet).toBeHidden();

    const entries = page.getByRole("list", { name: "Logged activities" });
    await expect(entries.getByRole("listitem")).toHaveCount(1);
    await expect(entries).toContainText("Running, 10 km/h");
    await expect(page.getByRole("region", { name: "Exercise total" })).toContainText("326");
    await expect.poll(() => data.count("activity_entries")).toBe(1);
    await captureScreen(page, testInfo, "activity");
  });
});
