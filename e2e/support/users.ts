import path from "node:path";

/*
 * Dedicated E2E accounts, one per Playwright project, so the mobile and
 * desktop runs never touch each other's data (or the owner's). They live only
 * in the local Supabase stack: sign-ups are disabled, so global setup creates
 * them with the Auth admin API. The password is a local test fixture, not a
 * secret.
 */

export type E2EProject = "mobile" | "desktop";

export const E2E_PASSWORD = "E2e-Local-Passw0rd";

export const E2E_USERS: Record<E2EProject, { email: string }> = {
  mobile: { email: "e2e-mobile@local.test" },
  desktop: { email: "e2e-desktop@local.test" },
};

const AUTH_DIR = path.join(import.meta.dirname, "..", ".auth");

/** Authenticated storage state written by global setup for a project. */
export function storageStatePath(project: E2EProject): string {
  return path.join(AUTH_DIR, `${project}.json`);
}

/** User ids written by global setup (project name -> auth user id). */
export const USER_IDS_PATH = path.join(AUTH_DIR, "users.json");

export function isE2EProject(name: string): name is E2EProject {
  return name === "mobile" || name === "desktop";
}
