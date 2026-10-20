import { expect, test } from "./support/fixtures";

// Icons must load signed out too (the login page is the first screen).
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("App icons", () => {
  test("serves the favicon and links the app icons", async ({ page, request }) => {
    const favicon = await request.get("/favicon.ico");
    expect(favicon.status()).toBe(200);
    expect(favicon.headers()["content-type"]).toContain("image/");

    await page.goto("/login");
    const icons = page.locator('head link[rel="icon"], head link[rel="apple-touch-icon"]');
    await expect(icons).not.toHaveCount(0);
    for (const href of await icons.evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""))) {
      const response = await request.get(href);
      expect(response.status(), href).toBe(200);
    }
  });
});
