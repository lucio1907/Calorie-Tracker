import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";
import { assignClientIp } from "./support/client-ip";
import { adminClient, ensureUser, resetUserData } from "./support/supabase-admin";
import { E2E_PASSWORD, E2E_USERS, isE2EProject, storageStatePath, USER_IDS_PATH } from "./support/users";

/**
 * Creates (or resets) one E2E account per project in the local Supabase
 * stack, signs each in through the real login form and saves the session as
 * that project's storageState. Tests then start authenticated; the login
 * spec opts out with an empty storage state.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const admin = adminClient();
  const ids: Record<string, string> = {};
  await mkdir(path.dirname(USER_IDS_PATH), { recursive: true });

  const browser = await chromium.launch();
  try {
    for (const project of config.projects) {
      if (!isE2EProject(project.name)) continue;
      const { email } = E2E_USERS[project.name];
      const id = await ensureUser(admin, email, E2E_PASSWORD);
      await resetUserData(admin, id);
      ids[project.name] = id;

      const context = await browser.newContext({ baseURL: project.use.baseURL });
      await assignClientIp(context);
      const page = await context.newPage();
      await page.goto("/login");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Contraseña").fill(E2E_PASSWORD);
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
      await page.waitForURL("**/today");
      await context.storageState({ path: storageStatePath(project.name) });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  await writeFile(USER_IDS_PATH, JSON.stringify(ids, null, 2));
}
