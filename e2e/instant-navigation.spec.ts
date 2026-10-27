import { instant } from "@next/playwright";
import type { Page } from "@playwright/test";
import { addDays, appToday, expect, test } from "./support/fixtures";

/*
 * Every (app) page must paint its shell (the page heading and a loading
 * placeholder) without waiting for per-user data, both on a direct load and
 * on a client navigation. Inside instant() Next.js holds back request-time
 * content, so only what is in the static shell / prefetched App Shell shows.
 * Needs a build with EXPOSE_TESTING_API=1 (see next.config.ts).
 */

type AppRoute = { path: string; heading: string; inTabBar: boolean };

const ROUTES: readonly AppRoute[] = [
  { path: "/today", heading: "Hoy", inTabBar: true },
  { path: "/diary", heading: "Diario", inTabBar: true },
  { path: "/activity", heading: "Actividad", inTabBar: false },
  { path: "/foods", heading: "Alimentos", inTabBar: false },
  { path: "/progress", heading: "Progreso", inTabBar: true },
  { path: "/settings", heading: "Ajustes", inTabBar: true },
];

/** The sidebar (desktop) or the bottom tab bar (mobile), whichever is on screen. */
function mainNav(page: Page, mobile: boolean) {
  return page.getByRole("navigation", { name: mobile ? "Principal (móvil)" : "Principal", exact: true });
}

/** The page skeleton (other status regions, like empty states, stay out). */
function loading(page: Page) {
  return page.getByRole("status").filter({ hasText: "Cargando…" });
}

/** The shell: the real page heading plus the loading placeholder for its data. */
async function expectShell(page: Page, heading: string): Promise<void> {
  await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
  await expect(loading(page)).toBeVisible();
}

/** Outside instant(): the data streams in and the placeholder goes away. */
async function expectLoaded(page: Page, heading: string): Promise<void> {
  await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
  await expect(loading(page)).toHaveCount(0);
}

for (const route of ROUTES) {
  test.describe(`${route.path} is instant`, () => {
    test("on an initial page load", async ({ page, baseURL }) => {
      await instant(
        page,
        async () => {
          await page.goto(route.path);
          await expectShell(page, route.heading);
        },
        { baseURL },
      );
      await expectLoaded(page, route.heading);
    });

    test("on a client navigation", async ({ page }, testInfo) => {
      const mobile = testInfo.project.name === "mobile";
      test.skip(mobile && !route.inTabBar, "not linked from the mobile tab bar");

      const from = route.path === "/today" ? ROUTES[1] : ROUTES[0];
      await page.goto(from.path);
      await expectLoaded(page, from.heading);
      const link = mainNav(page, mobile).getByRole("link", { name: route.heading, exact: true });
      await expect(link).toBeVisible();

      await instant(page, async () => {
        await link.click();
        await page.waitForURL((url) => url.pathname === route.path);
        await expectShell(page, route.heading);
      });
      await expectLoaded(page, route.heading);
    });
  });
}

test.describe("search-param navigations are instant", () => {
  for (const route of [ROUTES[1], ROUTES[2]]) {
    test(`${route.path} to the previous day`, async ({ page }) => {
      const yesterday = addDays(appToday(), -1);
      await page.goto(route.path);
      await expectLoaded(page, route.heading);

      await instant(page, async () => {
        await page.getByRole("link", { name: "Día anterior" }).click();
        await page.waitForURL((url) => url.searchParams.get("date") === yesterday);
        await expectShell(page, route.heading);
      });
      await expectLoaded(page, route.heading);
    });
  }

  test("/progress to another range", async ({ page }) => {
    await page.goto("/progress?range=30");
    await expectLoaded(page, "Progreso");

    await instant(page, async () => {
      await page.getByRole("link", { name: "7 días" }).click();
      await page.waitForURL((url) => url.searchParams.get("range") === "7");
      await expectShell(page, "Progreso");
    });
    await expectLoaded(page, "Progreso");
  });
});
