import { appToday, captureScreen, expect, test } from "./support/fixtures";

test.describe("Diary", () => {
  test("adds, edits and deletes an entry", async ({ page, data }, testInfo) => {
    await data.food("E2E Rice", { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 });

    await page.goto("/diary");
    await expect(page.getByRole("heading", { name: "Diary", level: 1 })).toBeVisible();

    // Add: lunch -> pick the food -> 150 g.
    await page.getByRole("button", { name: "Add food to Lunch" }).click();
    const addSheet = page.getByRole("dialog", { name: "Add to Lunch" });
    await addSheet.getByLabel("Search foods").fill("E2E Rice");
    await addSheet.getByRole("button", { name: /E2E Rice/ }).first().click();
    await addSheet.getByRole("textbox", { name: "Grams" }).fill("150");
    await expect(addSheet.getByText("195", { exact: true })).toBeVisible();
    await addSheet.getByRole("button", { name: "Add to diary" }).click();
    await expect(addSheet).toBeHidden();

    const lunch = page.getByRole("list", { name: "Lunch entries" });
    await expect(lunch.getByRole("listitem")).toHaveCount(1);
    await expect(lunch).toContainText("E2E Rice");
    await expect(lunch).toContainText("195");
    await captureScreen(page, testInfo, "diary");

    // Edit: 200 g.
    await lunch.getByRole("button", { name: /E2E Rice/ }).click();
    const editSheet = page.getByRole("dialog", { name: "Edit entry" });
    await editSheet.getByRole("textbox", { name: "Grams" }).fill("200");
    await editSheet.getByRole("button", { name: "Save changes" }).click();
    await expect(editSheet).toBeHidden();
    await expect(lunch).toContainText("260");

    // Delete.
    await lunch.getByRole("button", { name: /E2E Rice/ }).click();
    await editSheet.getByRole("button", { name: "Delete entry" }).click();
    await editSheet.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(editSheet).toBeHidden();
    await expect(page.getByRole("list", { name: "Lunch entries" })).toHaveCount(0);
    await expect.poll(() => data.count("food_entries")).toBe(0);
  });

  test("shows only the selected day's entries", async ({ page, data }) => {
    const today = appToday();
    await data.foodEntry({ date: today, meal: "dinner", label: "Today's soup", grams: 300, kcal: 150 });

    await page.goto("/diary?date=2026-01-15");
    await expect(page.getByText("Today's soup")).toHaveCount(0);
    await page.goto("/diary");
    await expect(page.getByRole("list", { name: "Dinner entries" })).toContainText("Today's soup");
  });
});
