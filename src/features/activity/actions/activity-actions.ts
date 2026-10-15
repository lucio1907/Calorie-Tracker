"use server";

import { refresh, revalidatePath } from "next/cache";
import type { CalendarDate } from "@/domain";
import { getCurrentUser } from "@/features/auth/data/current-user";
import type { ActionResult } from "@/features/foods/lib/types";
import { getLatestWeight } from "@/features/settings/data/settings";
import { createClient } from "@/lib/supabase/server";
import { getActivity } from "../data/activity";
import { activityKcal } from "../lib/activity-kcal";
import {
  activityIdSchema,
  parseCreateActivityForm,
  parseUpdateActivityForm,
  readActivityFormValues,
  type ParseActivityResult,
} from "../lib/activity-schema";
import type { ActivityFormState, CatalogActivity } from "../lib/types";
import { activityStrings as t } from "../strings";

/*
 * Activity mutations. The client sends only ids, a date and a duration: the
 * kcal snapshot is always computed here as MET (from the catalog row as
 * stored; RLS decides which rows the caller can see) x the caller's latest
 * weight on or before the entry date x hours, never taken from the browser.
 * user_id comes from the verified session; RLS enforces the same rules again.
 *
 * Today sums activity_entries.kcal per request (nothing is cached with
 * "use cache"), so after a write:
 * - revalidatePath("/today") drops Today's client-cache entry, so navigating
 *   there shows the new exercise kcal;
 * - refresh() re-renders the current Activity route in the same round trip.
 * Docs: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md
 *       node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md
 */

function revalidateTargets() {
  revalidatePath("/today");
  refresh();
}

function failed(formData: FormData, formError: string, needsWeight = false): ActivityFormState {
  return { status: "error", fieldErrors: {}, formError, needsWeight, values: readActivityFormValues(formData) };
}

function invalid(parsed: Extract<ParseActivityResult<unknown>, { ok: false }>): ActivityFormState {
  return { status: "error", fieldErrors: parsed.fieldErrors, formError: parsed.formError, needsWeight: false, values: parsed.values };
}

const SAVED: ActivityFormState = { status: "saved", fieldErrors: {}, formError: null, needsWeight: false, values: {} };

type Snapshot = { ok: true; kcal: number } | { ok: false; state: ActivityFormState };

/** kcal for `minutes` of `activity` with the caller's weight on or before `date`. */
async function computeSnapshot(
  formData: FormData,
  userId: string,
  activity: CatalogActivity,
  date: CalendarDate,
  minutes: number,
): Promise<Snapshot> {
  let weight;
  try {
    weight = await getLatestWeight(userId, date);
  } catch (error) {
    console.error("[activity] weight lookup failed", error);
    return { ok: false, state: failed(formData, t.errors.saveFailed) };
  }
  if (!weight) return { ok: false, state: failed(formData, t.errors.noWeight, true) };

  const kcal = activityKcal(activity.met, weight.kg, minutes);
  if (kcal.ok) return { ok: true, kcal: kcal.kcal };
  const state: ActivityFormState =
    kcal.error === "too_large"
      ? { ...failed(formData, t.validation.fix), fieldErrors: { minutes: t.validation.kcalTooLarge } }
      : failed(formData, t.errors.saveFailed);
  return { ok: false, state };
}

async function loadActivity(id: number): Promise<CatalogActivity | null | "error"> {
  try {
    return await getActivity(id);
  } catch (error) {
    console.error("[activity] activity lookup failed", error);
    return "error";
  }
}

/** Form action: logs `minutes` of a catalog activity on a date. */
export async function createActivityEntry(_previous: ActivityFormState, formData: FormData): Promise<ActivityFormState> {
  const user = await getCurrentUser();
  if (!user) return failed(formData, t.errors.unauthorized);

  const parsed = parseCreateActivityForm(formData);
  if (!parsed.ok) return invalid(parsed);
  const input = parsed.value;

  const activity = await loadActivity(input.activityId);
  if (activity === "error") return failed(formData, t.errors.saveFailed);
  if (!activity) return failed(formData, t.errors.activityMissing);

  const snapshot = await computeSnapshot(formData, user.id, activity, input.date, input.minutes);
  if (!snapshot.ok) return snapshot.state;

  const supabase = await createClient();
  const { error } = await supabase.from("activity_entries").insert({
    user_id: user.id,
    entry_date: input.date,
    activity_id: activity.id,
    label: activity.name,
    minutes: input.minutes,
    kcal: snapshot.kcal,
  });
  if (error) {
    console.error("[activity] insert failed", error.code, error.message);
    return failed(formData, t.errors.saveFailed);
  }

  revalidateTargets();
  return SAVED;
}

/**
 * Form action: changes an entry's duration and recomputes its kcal snapshot
 * from the activity's MET and the caller's weight on or before the entry's
 * own date (as stored, never from the form).
 */
export async function updateActivityEntry(_previous: ActivityFormState, formData: FormData): Promise<ActivityFormState> {
  const user = await getCurrentUser();
  if (!user) return failed(formData, t.errors.unauthorized);

  const parsed = parseUpdateActivityForm(formData);
  if (!parsed.ok) return invalid(parsed);
  const input = parsed.value;

  const supabase = await createClient();
  const { data: entry, error: readError } = await supabase
    .from("activity_entries")
    .select("id, entry_date, activity_id")
    .eq("id", input.entryId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) {
    console.error("[activity] entry lookup failed", readError.code, readError.message);
    return failed(formData, t.errors.saveFailed);
  }
  if (!entry) return failed(formData, t.errors.entryMissing);
  if (entry.activity_id === null) return failed(formData, t.errors.activityMissing);

  const activity = await loadActivity(entry.activity_id);
  if (activity === "error") return failed(formData, t.errors.saveFailed);
  if (!activity) return failed(formData, t.errors.activityMissing);

  const snapshot = await computeSnapshot(formData, user.id, activity, entry.entry_date, input.minutes);
  if (!snapshot.ok) return snapshot.state;

  const { data, error } = await supabase
    .from("activity_entries")
    .update({ minutes: input.minutes, kcal: snapshot.kcal })
    .eq("id", input.entryId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[activity] update failed", error.code, error.message);
    return failed(formData, error ? t.errors.saveFailed : t.errors.entryMissing);
  }

  revalidateTargets();
  return SAVED;
}

/** Deletes one of the caller's entries. */
export async function deleteActivityEntry(entryId: number): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t.errors.unauthorized };
  const id = activityIdSchema.safeParse(entryId);
  if (!id.success) return { ok: false, error: t.errors.deleteFailed };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_entries")
    .delete()
    .eq("id", id.data)
    .eq("user_id", user.id)
    .select("id");
  if (error) {
    console.error("[activity] delete failed", error.code, error.message);
    return { ok: false, error: t.errors.deleteFailed };
  }
  if (data.length === 0) return { ok: false, error: t.errors.entryMissing };

  revalidateTargets();
  return { ok: true, data: undefined };
}
