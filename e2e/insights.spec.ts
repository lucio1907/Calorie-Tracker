import { expect, test } from "./support/fixtures";

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
