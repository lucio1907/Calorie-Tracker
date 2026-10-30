import { addDays, appToday, captureScreen, expect, test } from "./support/fixtures";

test.describe("AI summaries", () => {
  test("shows the generate card and the summaries history", async ({ page }) => {
    await page.goto("/insights?range=7");

    await expect(page.getByRole("heading", { name: "Resúmenes de IA", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "7 días" })).toHaveAttribute("aria-current", "page");
    // Only the card is checked: clicking would call OpenRouter.
    const card = page.getByRole("region", { name: "Resumen con IA" });
    await expect(card.getByRole("button", { name: "Generar resumen" })).toBeEnabled();
    await expect(page.getByRole("heading", { name: "Resúmenes anteriores", level: 2 })).toBeVisible();
  });

  test("shows the range's numbers next to a stored summary, here and on Progress", async ({ page, data }, testInfo) => {
    const today = appToday();
    await data.profile();
    await data.weight(addDays(today, -10), 80);
    // Far over the maintain target: the balance works against the goal.
    await data.foodEntry({ date: addDays(today, -1), meal: "lunch", label: "Big lunch", grams: 500, kcal: 4500, protein: 120 });
    await data.insight({ rangeDays: 7, date: today, overview: "Venís comiendo por encima del objetivo." });

    await page.goto("/insights?range=7");
    const card = page.getByRole("region", { name: "Resumen con IA" });
    await expect(card.getByText("Venís comiendo por encima del objetivo.")).toBeVisible();
    const numbers = card.getByRole("region", { name: "Tus números del período" });
    await expect(numbers.getByText("En contra de tu meta")).toBeVisible();
    await expect(numbers.getByText(/^Balance promedio: \+\d+ kcal por día frente al objetivo$/)).toBeVisible();
    const macros = numbers.getByRole("list", { name: "Macros promedio frente al objetivo" });
    await expect(macros.getByRole("listitem")).toHaveCount(3);
    await expect(macros.getByRole("listitem").first()).toContainText(/Proteínas120 \/ \d+ g/);
    await captureScreen(page, testInfo, "insights-stats");

    await page.goto("/progress?range=7");
    await expect(page.getByRole("region", { name: "Tus números del período" }).getByText("En contra de tu meta")).toBeVisible();
  });

  test("is reached from Progress, keeping the range", async ({ page }) => {
    await page.goto("/progress?range=7");

    await page.getByRole("link", { name: "Ver todos los resúmenes" }).click();
    await expect(page).toHaveURL(/\/insights\?range=7$/);
    await expect(page.getByRole("heading", { name: "Resúmenes de IA", level: 1 })).toBeVisible();
  });

  test("is in the sidebar after Progress", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "the sidebar is md+ only; phones reach it from Progress");
    await page.goto("/today");

    const nav = page.getByRole("navigation", { name: "Principal", exact: true });
    await nav.getByRole("link", { name: "IA", exact: true }).click();
    await expect(page).toHaveURL(/\/insights$/);
    await expect(nav.getByRole("link", { name: "IA", exact: true })).toHaveAttribute("aria-current", "page");
  });
});
