import { addDays, appToday, captureScreen, expect, test } from "./support/fixtures";

test.describe("Today", () => {
  test("asks for a profile before there is a target", async ({ page }, testInfo) => {
    await page.goto("/today");

    await expect(page.getByText("Complete your profile to get a daily calorie target.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Set up profile" })).toHaveAttribute("href", "/settings");
    await captureScreen(page, testInfo, "today-setup");
  });

  test("shows the balance from today's food and exercise", async ({ page, data }, testInfo) => {
    const today = appToday();
    await data.profile();
    await data.weight(addDays(today, -1), 80);
    await data.foodEntry({ date: today, meal: "breakfast", label: "Oatmeal", grams: 80, kcal: 300 });
    await data.foodEntry({ date: today, meal: "lunch", label: "Pasta", grams: 250, kcal: 700 });
    await data.activityEntry({ date: today, label: "Running, 10 km/h", minutes: 30, kcal: 372 });
    // Another day's food never counts towards today.
    await data.foodEntry({ date: addDays(today, -1), meal: "dinner", label: "Pizza", grams: 300, kcal: 900 });

    await page.goto("/today");
    const balance = page.getByRole("region", { name: "Remaining" });
    await expect(balance).toBeVisible();
    await expect(balance.getByText("+ Exercise").locator("..")).toContainText("372");
    await expect(balance.getByText("− Food").locator("..")).toContainText("1000");
    await captureScreen(page, testInfo, "today");
  });

  test("sets protein by the latest weight and recalculates it when a new weight is logged", async ({ page, data }, testInfo) => {
    const today = appToday();
    await data.profile({ goal: "lose", goal_kg_per_week: 0.5 });
    await data.weight(addDays(today, -1), 80);

    await page.goto("/today");
    const macros = page.getByRole("region", { name: "Macros" });
    // 80 kg x 1.8 g/kg = 144 g.
    await expect(macros.getByText("Protein", { exact: true }).locator("..")).toContainText("0 / 144 g");
    const carbsBefore = await macros.getByText("Carbs", { exact: true }).locator("..").textContent();

    await page.goto("/settings");
    await page.getByLabel("Current weight (kg)").fill("90");
    await page.getByRole("button", { name: "Log weight" }).click();
    await expect(page.getByText("Latest: 90 kg (today)")).toBeVisible();

    await page.goto("/today");
    // 90 kg x 1.8 g/kg = 162 g; carbs and fat follow the new target.
    await expect(macros.getByText("Protein", { exact: true }).locator("..")).toContainText("0 / 162 g");
    await expect(macros.getByText("Carbs", { exact: true }).locator("..")).not.toHaveText(carbsBefore ?? "");
    await expect(page.getByText(/protein setting/)).toHaveCount(0);
    await captureScreen(page, testInfo, "today-macros");
  });

  test("warns when the protein setting exceeds the daily target", async ({ page, data }) => {
    const today = appToday();
    // Sedentary woman losing 1.5 kg/week: target raised to the 1200 kcal floor; 130 kg x 3 g/kg = 390 g = 1560 kcal.
    await data.profile({ sex: "female", height_cm: 160, activity_level: "sedentary", goal: "lose", goal_kg_per_week: 1.5, protein_g_per_kg: 3 });
    await data.weight(today, 130);

    await page.goto("/today");
    const macros = page.getByRole("region", { name: "Macros" });
    await expect(macros.getByText("Protein", { exact: true }).locator("..")).toContainText("0 / 300 g");
    await expect(macros.getByText("Fat", { exact: true }).locator("..")).toContainText("0 / 0 g");
    await expect(macros.getByText(/Your protein setting \(3 g\/kg\) needs more calories than your daily target/)).toBeVisible();
  });
});
