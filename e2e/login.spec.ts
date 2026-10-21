import { assignClientIp } from "./support/client-ip";
import { captureScreen, expect, test } from "./support/fixtures";
import { E2E_PASSWORD, E2E_USERS, isE2EProject } from "./support/users";

// Signed out: these tests exercise the login form itself.
test.use({ storageState: { cookies: [], origins: [] } });

function emailFor(project: string): string {
  if (!isE2EProject(project)) throw new Error(`unknown project ${project}`);
  return E2E_USERS[project].email;
}

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await assignClientIp(page);
  });

  test("redirects to login and signs in to Today", async ({ page }, testInfo) => {
    await page.goto("/diary");
    await expect(page).toHaveURL(/\/login\?next=%2Fdiary$/);
    await captureScreen(page, testInfo, "login");

    await page.getByLabel("Email").fill(emailFor(testInfo.project.name));
    await page.getByLabel("Password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Back to the page that asked for a session.
    await expect(page).toHaveURL(/\/diary$/);
    await expect(page.getByRole("heading", { name: "Diary", level: 1 })).toBeVisible();
  });

  test("rejects bad credentials", async ({ page }, testInfo) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(emailFor(testInfo.project.name));
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.locator("form").getByRole("alert")).toHaveText("Email or password is incorrect. Check them and try again.");
    await expect(page).toHaveURL(/\/login$/);
    // The email stays filled in for another try.
    await expect(page.getByLabel("Email")).toHaveValue(emailFor(testInfo.project.name));
    await captureScreen(page, testInfo, "login-error");
  });
});
