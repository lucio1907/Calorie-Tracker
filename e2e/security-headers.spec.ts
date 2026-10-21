import type { APIResponse, Response } from "@playwright/test";
import { expect, test } from "./support/fixtures";

/*
 * Every response carries the security headers from next.config.ts. The CSP
 * itself is exercised by the whole suite: the fixtures fail any test whose
 * pages log a Content Security Policy violation.
 */

const REQUIRED_CSP_DIRECTIVES = [
  "default-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "connect-src 'self'",
];

function expectSecurityHeaders(response: Response | APIResponse | null): void {
  expect(response).not.toBeNull();
  const headers = response!.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  const csp = headers["content-security-policy"] ?? "";
  for (const directive of REQUIRED_CSP_DIRECTIVES) {
    expect(csp).toContain(directive);
  }
  // Production builds never allow eval (React needs it only in development).
  expect(csp).not.toContain("'unsafe-eval'");
}

test.describe("Security headers", () => {
  test("are sent with app pages", async ({ page }) => {
    expectSecurityHeaders(await page.goto("/today"));
  });

  test("are sent with route handlers and static files", async ({ request }) => {
    expectSecurityHeaders(await request.get("/api/foods/search?q=apple"));
    expectSecurityHeaders(await request.get("/favicon.ico"));
  });

  test.describe("signed out", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("are sent with the login page", async ({ page }) => {
      expectSecurityHeaders(await page.goto("/login"));
    });
  });
});
