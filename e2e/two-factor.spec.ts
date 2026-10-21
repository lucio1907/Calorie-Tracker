import type { Page } from "@playwright/test";
import { assignClientIp } from "./support/client-ip";
import { captureScreen, expect, extraAccount, test } from "./support/fixtures";
import { totpCode } from "./support/totp";
import { E2E_MFA_USERS, E2E_PASSWORD, isE2EProject } from "./support/users";

/*
 * Two-factor authentication end to end, on an account of its own
 * (E2E_MFA_USERS) so no other spec ever meets a second factor: turn TOTP on
 * in Settings, sign in again through the challenge, then turn it off.
 */

// Signed out: the spec signs its own account in and out.
test.use({ storageState: { cookies: [], origins: [] } });

function emailFor(project: string): string {
  if (!isE2EProject(project)) throw new Error(`unknown project ${project}`);
  return E2E_MFA_USERS[project].email;
}

async function signIn(page: Page, email: string): Promise<void> {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function enterCode(page: Page, secret: string): Promise<void> {
  await page.getByLabel("Authentication code").fill(totpCode(secret));
}

test.describe("Two-factor authentication", () => {
  test.beforeEach(async ({ page }) => {
    await assignClientIp(page);
  });

  test("is set up in Settings, asked for at sign-in, and turned off again", async ({ page }, testInfo) => {
    const email = emailFor(testInfo.project.name);
    await extraAccount(email);

    // Turn it on.
    await page.goto("/login");
    await signIn(page, email);
    await expect(page).toHaveURL(/\/today$/);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Set up two-factor authentication" }).click();
    const qr = page.getByRole("img", { name: "QR code for your authenticator app" });
    await expect(qr).toBeVisible();
    // The data URI loads (the CSP allows it) and decodes as an image.
    expect(await qr.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    const secret = (await page.locator("code").textContent())?.trim() ?? "";
    expect(secret).toMatch(/^[A-Z2-7]+=*$/);
    await captureScreen(page, testInfo, "two-factor-setup");
    await enterCode(page, secret);
    await page.getByRole("button", { name: "Turn on" }).click();
    await expect(page.getByText("On. Signing in asks for a code from your authenticator app.")).toBeVisible();

    // The password alone now stops at the challenge, which can sign out.
    await page.getByRole("main").getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await signIn(page, email);
    await expect(page).toHaveURL(/\/login\/verify$/);
    await captureScreen(page, testInfo, "two-factor-challenge");
    await page.getByRole("main").getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Without the code the app sends every page back to the challenge.
    await page.goto("/diary");
    await expect(page).toHaveURL(/\/login\?next=%2Fdiary$/);
    await signIn(page, email);
    await expect(page).toHaveURL(/\/login\/verify\?next=%2Fdiary$/);
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login\/verify$/);

    // The code completes the sign-in and continues to the page that asked for it.
    await page.goto("/login/verify?next=%2Fdiary");
    await enterCode(page, secret);
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page).toHaveURL(/\/diary$/);
    await expect(page.getByRole("heading", { name: "Diary", level: 1 })).toBeVisible();

    // Turn it off (the session is aal2 now), so a rerun starts from scratch.
    await page.goto("/settings");
    await page.getByRole("button", { name: "Turn off two-factor authentication" }).click();
    await expect(page.getByText(/^Off\. Turn it on/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Set up two-factor authentication" })).toBeVisible();
  });
});
