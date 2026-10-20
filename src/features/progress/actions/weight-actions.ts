"use server";

import { refresh, revalidatePath } from "next/cache";
import { getCurrentUser } from "@/features/auth/data/current-user";
import type { ActionResult } from "@/features/foods/lib/types";
import { appToday } from "@/lib/app-time";
import { createClient } from "@/lib/supabase/server";
import {
  parseUpdateWeightEntryForm,
  parseWeightEntryForm,
  readWeightFormValues,
  weightEntryIdSchema,
  type ParseWeightEntryResult,
} from "../lib/weight-schema";
import type { WeightEntryFormState } from "../lib/types";
import { progressStrings as t } from "../strings";

/*
 * Weight log mutations. user_id comes from the verified session, never the
 * form; RLS enforces the same rule again. "Today" (the latest date allowed)
 * is the server's app-time-zone day, never the browser's.
 *
 * Today's target, Settings' latest weight and Activity's kcal all read
 * weight_entries per request (nothing is cached with "use cache"), so after a
 * write:
 * - revalidatePath drops those routes' client-cache entries, so navigating
 *   there shows the new weight;
 * - refresh() re-renders the current Progress route in the same round trip.
 * Docs: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md
 *       node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md
 */

function revalidateTargets() {
  revalidatePath("/today");
  revalidatePath("/settings");
  revalidatePath("/activity");
  refresh();
}

/** Postgres unique_violation: weight_entries allows one row per user per date. */
const UNIQUE_VIOLATION = "23505";

const SAVED: WeightEntryFormState = { status: "saved", fieldErrors: {}, formError: null, values: {} };

function failed(formData: FormData, formError: string): WeightEntryFormState {
  return { status: "error", fieldErrors: {}, formError, values: readWeightFormValues(formData) };
}

function invalid(parsed: Extract<ParseWeightEntryResult<unknown>, { ok: false }>): WeightEntryFormState {
  return { status: "error", fieldErrors: parsed.fieldErrors, formError: parsed.formError, values: parsed.values };
}

/** Form action: logs a weight for a date, replacing that date's weight when there already is one. */
export async function saveWeightEntry(_previous: WeightEntryFormState, formData: FormData): Promise<WeightEntryFormState> {
  const user = await getCurrentUser();
  if (!user) return failed(formData, t.errors.unauthorized);

  const parsed = parseWeightEntryForm(formData, appToday(new Date()));
  if (!parsed.ok) return invalid(parsed);

  const supabase = await createClient();
  const { error } = await supabase
    .from("weight_entries")
    .upsert(
      { user_id: user.id, entry_date: parsed.value.date, kg: parsed.value.kg },
      { onConflict: "user_id,entry_date" },
    );
  if (error) {
    console.error("[progress] weight upsert failed", error.code, error.message);
    return failed(formData, t.errors.saveFailed);
  }

  revalidateTargets();
  return SAVED;
}

/** Form action: changes an entry's date and weight. Moving it onto a date that already has a weight is refused. */
export async function updateWeightEntry(_previous: WeightEntryFormState, formData: FormData): Promise<WeightEntryFormState> {
  const user = await getCurrentUser();
  if (!user) return failed(formData, t.errors.unauthorized);

  const parsed = parseUpdateWeightEntryForm(formData, appToday(new Date()));
  if (!parsed.ok) return invalid(parsed);
  const input = parsed.value;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weight_entries")
    .update({ entry_date: input.date, kg: input.kg })
    .eq("id", input.entryId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error?.code === UNIQUE_VIOLATION) {
    return {
      status: "error",
      fieldErrors: { date: t.validation.dateTaken },
      formError: t.validation.fix,
      values: readWeightFormValues(formData),
    };
  }
  if (error) {
    console.error("[progress] weight update failed", error.code, error.message);
    return failed(formData, t.errors.saveFailed);
  }
  if (!data) return failed(formData, t.errors.entryMissing);

  revalidateTargets();
  return SAVED;
}

/** Deletes one of the caller's weight entries. */
export async function deleteWeightEntry(entryId: number): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t.errors.unauthorized };
  const id = weightEntryIdSchema.safeParse(entryId);
  if (!id.success) return { ok: false, error: t.errors.deleteFailed };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weight_entries")
    .delete()
    .eq("id", id.data)
    .eq("user_id", user.id)
    .select("id");
  if (error) {
    console.error("[progress] weight delete failed", error.code, error.message);
    return { ok: false, error: t.errors.deleteFailed };
  }
  if (data.length === 0) return { ok: false, error: t.errors.entryMissing };

  revalidateTargets();
  return { ok: true, data: undefined };
}
