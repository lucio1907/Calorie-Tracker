import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test as base, expect, type Page, type TestInfo } from "@playwright/test";
import type { Database } from "../../src/lib/supabase/database.types";
import { adminClient, ensureUser, removeMfaFactors, resetUserData, type AdminClient } from "./supabase-admin";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
import { E2E_PASSWORD, isE2EProject, USER_IDS_PATH, type E2EProject } from "./users";

/** The app's time zone (src/lib/app-time.ts): "today" in tests must match the server's. */
export const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";

/** Today's calendar day in the app time zone, as YYYY-MM-DD. */
export function appToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** `date` moved by `days`, pure calendar math. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Adult profile that yields a calorie target once a weight is logged. */
export const ADULT_PROFILE = {
  sex: "male",
  birth_date: "1990-05-10",
  height_cm: 180,
  activity_level: "moderate",
  goal: "maintain",
  goal_kg_per_week: 0,
  protein_g_per_kg: 1.8,
  carbs_share_pct: 60,
  fat_share_pct: 40,
} as const;

type Unwrap<T> = T extends PromiseLike<{ data: infer D; error: { message: string } | null }> ? D : never;

async function must<T extends PromiseLike<{ data: unknown; error: { message: string } | null }>>(
  label: string,
  request: T,
): Promise<NonNullable<Unwrap<T>>> {
  const { data, error } = await request;
  if (error) throw new Error(`E2E seed ${label}: ${error.message}`);
  return data as NonNullable<Unwrap<T>>;
}

/** Seeds rows for the current project's E2E user (service role, bypasses RLS). */
export class E2EData {
  constructor(
    private readonly admin: AdminClient,
    readonly userId: string,
  ) {}

  reset(): Promise<void> {
    return resetUserData(this.admin, this.userId);
  }

  async profile(overrides: Partial<Omit<ProfileInsert, "user_id">> = {}): Promise<void> {
    await must(
      "profile",
      this.admin.from("profiles").upsert({ user_id: this.userId, ...ADULT_PROFILE, ...overrides }, { onConflict: "user_id" }),
    );
  }

  /** Backdates the user's profile history so its only version took effect on `date`. */
  async profileEffectiveSince(date: string): Promise<void> {
    await must(
      "profile history",
      this.admin.from("profile_versions").update({ effective_date: date }).eq("user_id", this.userId).select("user_id").single(),
    );
  }

  /** The user's stored macro settings, with the numeric column as a number. */
  async macroSettings(): Promise<{ protein_g_per_kg: number; carbs_share_pct: number; fat_share_pct: number }> {
    const row = await must(
      "macro settings",
      this.admin
        .from("profiles")
        .select("protein_g_per_kg, carbs_share_pct, fat_share_pct")
        .eq("user_id", this.userId)
        .single(),
    );
    return { ...row, protein_g_per_kg: Number(row.protein_g_per_kg) };
  }

  async weight(date: string, kg: number): Promise<void> {
    await must("weight", this.admin.from("weight_entries").insert({ user_id: this.userId, entry_date: date, kg }));
  }

  /** A custom food owned by the user; returns its id. */
  async food(name: string, per100: { kcal: number; protein?: number; carbs?: number; fat?: number }): Promise<number> {
    const row = await must(
      "food",
      this.admin
        .from("foods")
        .insert({
          owner_id: this.userId,
          source: "custom",
          name,
          kcal_per_100g: per100.kcal,
          protein_per_100g: per100.protein ?? 0,
          carbs_per_100g: per100.carbs ?? 0,
          fat_per_100g: per100.fat ?? 0,
        })
        .select("id")
        .single(),
    );
    return row.id;
  }

  async foodEntry(entry: { date: string; meal: string; foodId?: number; label: string; grams: number; kcal: number }): Promise<void> {
    await must(
      "food entry",
      this.admin.from("food_entries").insert({
        user_id: this.userId,
        entry_date: entry.date,
        meal: entry.meal,
        food_id: entry.foodId ?? null,
        label: entry.label,
        grams: entry.grams,
        kcal: entry.kcal,
      }),
    );
  }

  async activityEntry(entry: { date: string; label: string; minutes: number; kcal: number }): Promise<void> {
    await must(
      "activity entry",
      this.admin.from("activity_entries").insert({
        user_id: this.userId,
        entry_date: entry.date,
        label: entry.label,
        minutes: entry.minutes,
        kcal: entry.kcal,
      }),
    );
  }

  async count(table: "food_entries" | "activity_entries" | "weight_entries"): Promise<number> {
    const { count, error } = await this.admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("user_id", this.userId);
    if (error) throw new Error(`E2E count ${table}: ${error.message}`);
    return count ?? 0;
  }
}

function userIdFor(project: E2EProject): string {
  const ids = JSON.parse(readFileSync(USER_IDS_PATH, "utf8")) as Record<string, string>;
  const id = ids[project];
  if (!id) throw new Error(`E2E: no user id for project ${project}; did global setup run?`);
  return id;
}

/** Picks `option` in the custom Select labelled `label` (a button opening a listbox). */
export async function chooseOption(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(label) }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(page.getByRole("listbox")).toBeHidden();
}

/**
 * Full-page screenshot of the current screen, attached to the report and
 * saved under test-results/screenshots/<project>/ for the CI artifact. A
 * record, not a pixel-diff assertion.
 */
export async function captureScreen(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const dir = path.join("test-results", "screenshots", testInfo.project.name);
  await mkdir(dir, { recursive: true });
  const body = await page.screenshot({ fullPage: true, animations: "disabled", path: path.join(dir, `${name}.png`) });
  await testInfo.attach(name, { body, contentType: "image/png" });
}

let admin: AdminClient | null = null;

/**
 * An extra E2E account (password E2E_PASSWORD), created on first use and
 * emptied (data and MFA factors), for tests that need a user other than the
 * project's own.
 */
export async function extraAccount(email: string): Promise<E2EData> {
  admin ??= adminClient();
  const data = new E2EData(admin, await ensureUser(admin, email, E2E_PASSWORD));
  await removeMfaFactors(admin, data.userId);
  await data.reset();
  return data;
}

export const test = base.extend<{ data: E2EData; noCspViolations: void }>({
  // Fails any test whose pages log a Content Security Policy violation, so the
  // whole suite proves the policy in next.config.ts lets every screen work.
  noCspViolations: [
    async ({ context }, provide) => {
      const violations: string[] = [];
      context.on("console", (message) => {
        if (message.type() === "error" && message.text().includes("Content Security Policy")) {
          violations.push(message.text());
        }
      });
      await provide();
      expect(violations, "Content Security Policy violations").toEqual([]);
    },
    { auto: true },
  ],
  // Every test starts from an empty account (cleaned before, not after, so a
  // failed run leaves its data around for debugging).
  data: [
    async ({ baseURL }, provide, testInfo) => {
      expect(baseURL).toBeTruthy();
      const project = testInfo.project.name;
      if (!isE2EProject(project)) throw new Error(`E2E: unknown project ${project}`);
      admin ??= adminClient();
      const data = new E2EData(admin, userIdFor(project));
      await data.reset();
      await provide(data);
    },
    { auto: true },
  ],
});

export { expect };
