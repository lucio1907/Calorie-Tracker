import type { Page } from "@playwright/test";
import { expect, extraAccount, test } from "./support/fixtures";
import { E2E_PASSWORD, E2E_SIGN_OUT_USERS, isE2EProject } from "./support/users";

/*
 * Signing out must be a full document load. A client navigation would keep
 * the signed-out user's screens mounted in hidden <Activity> boundaries
 * (cacheComponents), and the next account to sign in in the same tab would
 * see, and could save, that user's form values.
 */

// Signed out: these tests sign their own accounts in and out (E2E_SIGN_OUT_USERS).
test.use({ storageState: { cookies: [], origins: [] } });

function accountsFor(project: string) {
  if (!isE2EProject(project)) throw new Error(`unknown project ${project}`);
  return E2E_SIGN_OUT_USERS[project];
}

async function signIn(page: Page, email: string): Promise<void> {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/today$/);
}

/** The Settings page's own sign-out button (the sidebar has another on desktop). */
function signOutButton(page: Page) {
  return page.getByRole("main").getByRole("button", { name: "Sign out" });
}

test.describe("Sign out", () => {
  test("leaves nothing of the account behind for the next one in the same tab", async ({ page }, testInfo) => {
    const [first, second] = accountsFor(testInfo.project.name);
    await (await extraAccount(first.email)).profile({ height_cm: 187 });
    await (await extraAccount(second.email)).profile({ height_cm: 158 });

    await page.goto("/login");
    await signIn(page, first.email);
    await page.goto("/settings");
    await expect(page.getByLabel("Height (cm)")).toHaveValue("187");

    await signOutButton(page).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    // Not even hidden: the previous account's Settings form is gone from the document.
    expect(await page.content()).not.toContain('value="187"');

    await signIn(page, second.email);
    const mobile = testInfo.project.name === "mobile";
    await page
      .getByRole("navigation", { name: mobile ? "Main (mobile)" : "Main", exact: true })
      .getByRole("link", { name: "Settings", exact: true })
      .click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByLabel("Height (cm)")).toHaveValue("158");
  });

  test("still signs out before hydration (without JavaScript)", async ({ browser, page }, testInfo) => {
    const [first] = accountsFor(testInfo.project.name);
    await extraAccount(first.email);
    // The login form itself needs JavaScript: sign in first, then reuse the session without it.
    await page.goto("/login");
    await signIn(page, first.email);
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      storageState: await page.context().storageState(),
      javaScriptEnabled: false,
    });

    try {
      const noScript = await context.newPage();
      await noScript.goto("/settings");
      await signOutButton(noScript).click();

      await expect(noScript).toHaveURL(/\/login$/);
      // Signed out on the server too: protected pages send the browser back to login.
      await noScript.goto("/settings");
      await expect(noScript).toHaveURL(/\/login\?next=%2Fsettings$/);
    } finally {
      await context.close();
    }
  });
});
