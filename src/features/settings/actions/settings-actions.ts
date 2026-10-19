"use server";

import { refresh, revalidatePath } from "next/cache";
import { getCurrentUser } from "@/features/auth/data/current-user";
import { appToday } from "@/lib/app-time";
import { createClient } from "@/lib/supabase/server";
import { parseProfileForm, PROFILE_LIMITS } from "../lib/profile-schema";
import type { ProfileFormState, ProfileValues, WeightFormState } from "../lib/types";
import { parseWeightForm, todayWeightEntry } from "../lib/weight-entry";
import { settingsStrings as t } from "../strings";

/*
 * Settings mutations. Each action re-checks the session and writes only the
 * caller's rows (user_id comes from the verified session, never the form);
 * RLS enforces the same rule again. Dates come from the server clock in the
 * app time zone, never from the browser.
 *
 * Today and Settings read this data per request (nothing is cached with
 * "use cache"), so there is no server cache to invalidate. After a write:
 * - revalidatePath("/today") drops Today's client-cache entry and refreshes
 *   its prefetch, so navigating there shows the new target (likewise
 *   "/progress", which charts the weight and each day's target);
 * - refresh() re-renders the current Settings route in the same round trip.
 * Docs: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md
 *       node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md
 */

function revalidateTargets() {
  revalidatePath("/today");
  revalidatePath("/progress");
  refresh();
}

function toProfileColumns(profile: ProfileValues) {
  return {
    sex: profile.sex,
    birth_date: profile.birthDate,
    height_cm: profile.heightCm,
    activity_level: profile.activityLevel,
    goal: profile.goal,
    goal_kg_per_week: profile.goalKgPerWeek,
    protein_g_per_kg: profile.proteinGPerKg,
    carbs_share_pct: profile.carbFatSplit.carbs,
    fat_share_pct: profile.carbFatSplit.fat,
  };
}

function profileFailed(formError: string): ProfileFormState {
  return { status: "error", fieldErrors: {}, formError };
}

/**
 * The profiles_enforce_min_age trigger (migration profiles_min_age) rejects an
 * under-18 birth date with a check_violation whose message starts with
 * "profiles_min_age:". The form validates the same rule first; this catches a
 * disagreement between the two clocks (defense in depth).
 */
function isMinAgeViolation(error: { code?: string; message?: string }): boolean {
  return error.code === "23514" && (error.message ?? "").startsWith("profiles_min_age:");
}

/** Form action: creates or updates the caller's profile row. */
export async function saveProfile(_previous: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await getCurrentUser();
  if (!user) return profileFailed(t.errors.unauthorized);

  const parsed = parseProfileForm(formData, appToday(new Date()));
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.fieldErrors, formError: parsed.formError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, ...toProfileColumns(parsed.value) }, { onConflict: "user_id" });
  if (error && isMinAgeViolation(error)) {
    return {
      status: "error",
      fieldErrors: { birthDate: t.validation.minAge(PROFILE_LIMITS.minAgeYears) },
      formError: t.validation.fix,
    };
  }
  if (error) {
    console.error("[settings] profile upsert failed", error.code, error.message);
    return profileFailed(t.errors.profileSaveFailed);
  }

  revalidateTargets();
  return { status: "saved", fieldErrors: {}, formError: null };
}

/** Form action: logs today's weight, replacing today's value when there already is one. */
export async function logWeight(_previous: WeightFormState, formData: FormData): Promise<WeightFormState> {
  const raw = formData.get("kg");
  const value = typeof raw === "string" ? raw : "";

  const user = await getCurrentUser();
  if (!user) return { status: "error", fieldError: null, formError: t.errors.unauthorized, value };

  const parsed = parseWeightForm(formData);
  if (!parsed.ok) return { status: "error", fieldError: parsed.error, formError: null, value };

  const supabase = await createClient();
  const { error } = await supabase
    .from("weight_entries")
    .upsert({ user_id: user.id, ...todayWeightEntry(parsed.value, new Date()) }, { onConflict: "user_id,entry_date" });
  if (error) {
    console.error("[settings] weight upsert failed", error.code, error.message);
    return { status: "error", fieldError: null, formError: t.errors.weightSaveFailed, value };
  }

  revalidateTargets();
  return { status: "saved", fieldError: null, formError: null, value: "" };
}
