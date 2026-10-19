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
});
