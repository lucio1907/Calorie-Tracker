import { randomBytes } from "node:crypto";
import type { BrowserContext, Page } from "@playwright/test";

/*
 * The sign-in throttle (migration sign_in_throttle) allows 10 attempts per
 * client IP and 15-minute window, and a two-factor code takes one too. Every
 * E2E browser connects from 127.0.0.1, and one run spends 20 attempts (global
 * setup 2, login spec 4, sign-out spec 6, two-factor spec 8), more with
 * retries or a second run within 15 minutes. So each browser context that
 * signs in poses as its own client: `next start` keeps an x-real-ip the
 * client sends (on Vercel the edge sets it), and the app keys the throttle by
 * it. Only the app's /login and /login/verify requests (the pages and their
 * Server Actions) get the header, so cross-origin requests see no extra header.
 */

/** A fresh address from the IPv6 documentation range (2001:db8::/32). */
function documentationIp(): string {
  const [a, b] = [randomBytes(2).toString("hex"), randomBytes(2).toString("hex")];
  return `2001:db8::${a}:${b}`;
}

/** Sends the app's sign-in requests from this page or context with a client IP of their own. */
export async function assignClientIp(target: Page | BrowserContext): Promise<void> {
  const ip = documentationIp();
  await target.route(
    (url) => url.pathname === "/login" || url.pathname === "/login/verify",
    (route) => route.continue({ headers: { ...route.request().headers(), "x-real-ip": ip } }),
  );
}
