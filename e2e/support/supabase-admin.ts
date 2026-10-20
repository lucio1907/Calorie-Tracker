import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";

/*
 * Service-role access to the LOCAL Supabase stack for test setup and cleanup.
 * The key comes from SUPABASE_SERVICE_ROLE_KEY when set (CI exports it from
 * `npx supabase status`), otherwise from `npx supabase status` directly. It is
 * never sent to the browser.
 */

export type AdminClient = SupabaseClient<Database>;

type LocalStatus = { API_URL?: string; SERVICE_ROLE_KEY?: string; SECRET_KEY?: string };

function readLocalStatus(): LocalStatus {
  const output = execFileSync("npx", ["supabase", "status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  // The CLI may print notices around the JSON document.
  const json = output.slice(output.indexOf("{"), output.lastIndexOf("}") + 1);
  return JSON.parse(json) as LocalStatus;
}

let cached: { url: string; serviceRoleKey: string } | null = null;

export function supabaseAdminEnv(): { url: string; serviceRoleKey: string } {
  if (cached) return cached;
  let url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    const status = readLocalStatus();
    url ??= status.API_URL;
    serviceRoleKey ??= status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;
  }
  if (!url || !serviceRoleKey) {
    throw new Error("E2E: start the local stack (npx supabase start) or set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  }
  const host = new URL(url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    // Cleanup deletes every row of the E2E users: never point it at a hosted project.
    throw new Error(`E2E: refusing to run against a non-local Supabase URL (${host}).`);
  }
  cached = { url, serviceRoleKey };
  return cached;
}

export function adminClient(): AdminClient {
  const { url, serviceRoleKey } = supabaseAdminEnv();
  return createClient<Database>(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Creates the user (email confirmed) or resets its password; returns its id. */
export async function ensureUser(admin: AdminClient, email: string, password: string): Promise<string> {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (!created.error) return created.data.user.id;

  // Already registered: find it and make sure the password matches.
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`E2E: list users: ${error.message}`);
    const user = data.users.find((candidate) => candidate.email === email);
    if (user) {
      const updated = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
      if (updated.error) throw new Error(`E2E: update ${email}: ${updated.error.message}`);
      return user.id;
    }
    if (data.users.length < 200) break;
  }
  throw new Error(`E2E: could not create ${email}: ${created.error.message}`);
}

async function check(label: string, request: PromiseLike<{ error: { message: string } | null }>): Promise<void> {
  const { error } = await request;
  if (error) throw new Error(`E2E: ${label}: ${error.message}`);
}

/** Deletes every row the user owns (diary, activity, weights, own foods and activities, recipes, profile). */
export async function resetUserData(admin: AdminClient, userId: string): Promise<void> {
  await check("food_entries", admin.from("food_entries").delete().eq("user_id", userId));
  await check("activity_entries", admin.from("activity_entries").delete().eq("user_id", userId));
  await check("weight_entries", admin.from("weight_entries").delete().eq("user_id", userId));
  await check("food_favorites", admin.from("food_favorites").delete().eq("user_id", userId));
  await check("recipes", admin.from("recipes").delete().eq("user_id", userId));
  await check("foods", admin.from("foods").delete().eq("owner_id", userId));
  await check("activities", admin.from("activities").delete().eq("owner_id", userId));
  await check("profiles", admin.from("profiles").delete().eq("user_id", userId));
}
