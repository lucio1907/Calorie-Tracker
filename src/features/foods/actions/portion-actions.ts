"use server";

import { getCurrentUser } from "@/features/auth/data/current-user";
import { isRowQuotaViolation } from "@/lib/supabase/row-quota";
import { createClient } from "@/lib/supabase/server";
import { foodIdSchema, parsePortionForm } from "../lib/food-schema";
import type { PortionFormState } from "../lib/form-state";
import type { ActionResult } from "../lib/types";
import { foodsStrings as t } from "../strings";

/*
 * Portions of the user's own foods. RLS on food_portions only allows writes
 * when the parent food belongs to the caller, so a shared catalog food (or
 * someone else's) simply affects 0 rows. The one exception is the caller's
 * personal "unidad" on a shared food (owner_id = caller, created by the diary
 * entry actions), which only that caller can see and change.
 */

const UNIQUE_VIOLATION = "23505";

function readValues(formData: FormData): PortionFormState["values"] {
  const label = formData.get("label");
  const grams = formData.get("grams");
  return {
    label: typeof label === "string" ? label : undefined,
    grams: typeof grams === "string" ? grams : undefined,
  };
}

function failure(previous: PortionFormState, formData: FormData, formError: string): PortionFormState {
  return { ...previous, status: "error", fieldErrors: {}, formError, values: readValues(formData) };
}

export async function addPortion(previous: PortionFormState, formData: FormData): Promise<PortionFormState> {
  const user = await getCurrentUser();
  if (!user) return failure(previous, formData, t.errors.unauthorized);
  const foodId = foodIdSchema.safeParse(formData.get("foodId"));
  if (!foodId.success) return failure(previous, formData, t.portions.failed);

  const parsed = parsePortionForm(formData);
  if (!parsed.ok) {
    return { ...previous, status: "error", fieldErrors: parsed.fieldErrors, formError: null, values: readValues(formData) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("food_portions")
    .insert({ food_id: foodId.data, label: parsed.value.label, grams: parsed.value.grams });

  if (error?.code === UNIQUE_VIOLATION) {
    return { ...previous, status: "error", fieldErrors: { label: t.portions.duplicate }, formError: null, values: readValues(formData) };
  }
  if (isRowQuotaViolation(error)) return failure(previous, formData, t.portions.limitReached);
  if (error) return failure(previous, formData, t.portions.failed);

  return { status: "saved", fieldErrors: {}, formError: null, values: {}, version: previous.version + 1 };
}

export async function updatePortion(previous: PortionFormState, formData: FormData): Promise<PortionFormState> {
  const user = await getCurrentUser();
  if (!user) return failure(previous, formData, t.errors.unauthorized);
  const portionId = foodIdSchema.safeParse(formData.get("portionId"));
  if (!portionId.success) return failure(previous, formData, t.portions.failed);

  const parsed = parsePortionForm(formData);
  if (!parsed.ok) {
    return { ...previous, status: "error", fieldErrors: parsed.fieldErrors, formError: null, values: readValues(formData) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("food_portions")
    .update({ label: parsed.value.label, grams: parsed.value.grams })
    .eq("id", portionId.data)
    .select("id");

  if (error?.code === UNIQUE_VIOLATION) {
    return { ...previous, status: "error", fieldErrors: { label: t.portions.duplicate }, formError: null, values: readValues(formData) };
  }
  if (error || data.length === 0) return failure(previous, formData, t.portions.failed);

  return { status: "saved", fieldErrors: {}, formError: null, values: {}, version: previous.version + 1 };
}

export async function deletePortion(portionId: number): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t.errors.unauthorized };
  const id = foodIdSchema.safeParse(portionId);
  if (!id.success) return { ok: false, error: t.portions.failed };

  const supabase = await createClient();
  const { data, error } = await supabase.from("food_portions").delete().eq("id", id.data).select("id");
  if (error || data.length === 0) return { ok: false, error: t.portions.failed };
  return { ok: true, data: undefined };
}
