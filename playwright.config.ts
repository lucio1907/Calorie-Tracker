import { defineConfig, devices } from "@playwright/test";
import { storageStatePath } from "./e2e/support/users";

/*
 * E2E against a production build (`next build` + `next start`) and the local
 * Supabase stack. Each project signs in as its own E2E user (global setup),
 * and runs one test at a time because tests reset that user's data; the two
 * projects run in parallel.
 *
 * Locally `npm run test:e2e` builds first; CI builds in its own step and sets
 * E2E_SKIP_BUILD=1. Set E2E_BASE_URL to test a server you started yourself.
 * The instant-navigation specs need EXPOSE_TESTING_API=1 for both `next build`
 * (the npm script and the CI build step set it) and `next start`, which reads
 * next.config.ts again at runtime (set below).
 */

const PORT = Number(process.env.E2E_PORT ?? 3210);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const start = `npm run start -- --hostname 127.0.0.1 --port ${PORT}`;

/*
 * The environment of `next build` + `next start`: only what they need. The
 * test runner itself may hold SUPABASE_SERVICE_ROLE_KEY (CI passes it for the
 * fixtures' admin client), and the app must never see it. Playwright merges
 * process.env under webServer.env, so every other variable is unset here
 * explicitly (Node drops undefined entries when it spawns the command).
 */
const WEB_SERVER_ENV_KEYS = [
  "PATH",
  "HOME",
  "TMPDIR",
  "LANG",
  "TZ",
  "CI",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

function webServerEnv(): Record<string, string> {
  const env: Record<string, string | undefined> = Object.fromEntries(
    Object.keys(process.env).map((key) => [key, undefined]),
  );
  for (const key of WEB_SERVER_ENV_KEYS) env[key] = process.env[key];
  env.EXPOSE_TESTING_API = "1";
  return env as Record<string, string>;
}

const shared = {
  baseURL,
  timezoneId: "America/Argentina/Buenos_Aires",
  locale: "en-US",
  reducedMotion: "reduce",
  trace: "retain-on-failure",
  screenshot: "only-on-failure",
} as const;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./e2e/global-setup.ts",
  outputDir: "test-results",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }], ["github"]]
    : [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  projects: [
    {
      name: "mobile",
      workers: 1,
      use: { ...devices["Pixel 7"], ...shared, storageState: storageStatePath("mobile") },
    },
    {
      name: "desktop",
      workers: 1,
      use: {
        ...devices["Desktop Chrome"],
        ...shared,
        viewport: { width: 1440, height: 900 },
        storageState: storageStatePath("desktop"),
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: process.env.E2E_SKIP_BUILD ? start : `npm run build && ${start}`,
        env: webServerEnv(),
        url: `${baseURL}/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
