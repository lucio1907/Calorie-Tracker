"use server";

import { refresh } from "next/cache";
import { MAX_ENTRY_GRAMS, nutrientSnapshot } from "@/domain";
import { getCurrentUser } from "@/features/auth/data/current-user";
import { getFoodDetail } from "@/features/foods/data/foods";
import type { ActionResult, FoodDetail } from "@/features/foods/lib/types";
import type { Database } from "@/lib/supabase/database.types";
import { isRowQuotaViolation } from "@/lib/supabase/row-quota";
import { createClient } from "@/lib/supabase/server";
import { amountChanged, resolveEntryAmount, type AmountError, type EntryUnit } from "../lib/entry-amount";
import { entryLabel } from "../lib/entry-label";
import {
  entryIdSchema,
  parseCreateEntryForm,
  parseUpdateEntryForm,
  readEntryFormValues,
  type ParseEntryResult,
} from "../lib/entry-schema";
import type { EntryAmount, EntryFormState } from "../lib/types";
import { diaryStrings as t } from "../strings";

/*
 * Diary mutations. The client sends only ids, a meal, a unit and an amount:
 * grams and the nutrient snapshot are always computed here from the food as
 * stored (RLS decides which foods the caller can see), never taken from the
 * browser. Each action re-checks the session and scopes writes to the
 * caller; RLS enforces the same rules again.
 * After a write, refresh() re-renders the diary in the same round trip
 * (its data is read per request, not cached).
 * Docs: node_modules/next/dist/docs/01-app/02-guides/server-actions.md
 *       node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md
 */

function failed(formData: FormData, formError: string): EntryFormState {
  return { status: "error", fieldErrors: {}, formError, values: readEntryFormValues(formData) };
}

function amountFailed(formData: FormData, error: AmountError): EntryFormState {
  const values = readEntryFormValues(formData);
  switch (error) {
    case "portion_missing":
      return { status: "error", fieldErrors: { unit: t.errors.portionMissing }, formError: t.validation.fix, values };
    case "too_large":
      return {
        status: "error",
        fieldErrors: { amount: t.validation.totalTooLarge(MAX_ENTRY_GRAMS) },
        formError: t.validation.fix,
        values,
      };
    case "too_small":
      return { status: "error", fieldErrors: { amount: t.validation.totalTooSmall }, formError: t.validation.fix, values };
    case "invalid_amount":
      return { status: "error", fieldErrors: { amount: t.validation.number }, formError: t.validation.fix, values };
  }
}

function invalid(parsed: Extract<ParseEntryResult<unknown>, { ok: false }>): EntryFormState {
  return { status: "error", fieldErrors: parsed.fieldErrors, formError: parsed.formError, values: parsed.values };
}

const SAVED: EntryFormState = { status: "saved", fieldErrors: {}, formError: null, values: {} };

async function loadFood(foodId: number, userId: string): Promise<FoodDetail | null> {
  try {
    return await getFoodDetail(foodId, userId);
  } catch (error) {
    console.error("[diary] food lookup failed", error);
    return null;
  }
}

type EntryUpdate = Database["public"]["Tables"]["food_entries"]["Update"];

/** Grams + snapshot columns for `amount` of `food`. */
function amountColumns(food: FoodDetail, amount: EntryAmount) {
  return {
    grams: amount.grams,
    quantity: amount.quantity,
    portion_label: amount.portionLabel,
    ...nutrientSnapshot(food, amount.grams),
  };
}

function resolve(food: FoodDetail, unit: EntryUnit, amount: number) {
  return resolveEntryAmount(unit, amount, food.portions);
}

/** Form action: logs `amount` of a food into a meal on a date. */
export async function createEntry(_previous: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const user = await getCurrentUser();
  if (!user) return failed(formData, t.errors.unauthorized);

  const parsed = parseCreateEntryForm(formData);
  if (!parsed.ok) return invalid(parsed);
  const input = parsed.value;

  const food = await loadFood(input.foodId, user.id);
  if (!food) return failed(formData, t.errors.foodMissing);

  const amount = resolve(food, input.unit, input.amount);
  if (!amount.ok) return amountFailed(formData, amount.error);

  const supabase = await createClient();
  const { error } = await supabase.from("food_entries").insert({
    user_id: user.id,
    entry_date: input.date,
    meal: input.meal,
    food_id: food.id,
    label: entryLabel(food),
    ...amountColumns(food, amount.value),
  });
  if (isRowQuotaViolation(error)) return failed(formData, t.errors.dayFull);
  if (error) {
    console.error("[diary] insert failed", error.code, error.message);
    return failed(formData, t.errors.saveFailed);
  }

  refresh();
  return SAVED;
}

/**
 * Form action: moves an entry to another meal and/or changes its amount.
 * The snapshot is recomputed (from the food as it is now) only when the
 * amount changes; a meal-only edit keeps the logged values untouched.
 */
export async function updateEntry(_previous: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const user = await getCurrentUser();
  if (!user) return failed(formData, t.errors.unauthorized);

  const parsed = parseUpdateEntryForm(formData);
  if (!parsed.ok) return invalid(parsed);
  const input = parsed.value;

  const supabase = await createClient();
  const { data: entry, error: readError } = await supabase
    .from("food_entries")
    .select("id, food_id, grams, quantity, portion_label")
    .eq("id", input.entryId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) return failed(formData, t.errors.saveFailed);
  if (!entry) return failed(formData, t.errors.entryMissing);

  let changes: EntryUpdate = { meal: input.meal };
  if (input.change) {
    if (entry.food_id === null) return failed(formData, t.errors.foodMissing);
    const food = await loadFood(entry.food_id, user.id);
    if (!food) return failed(formData, t.errors.foodMissing);

    const amount = resolve(food, input.change.unit, input.change.amount);
    if (!amount.ok) return amountFailed(formData, amount.error);

    const logged: EntryAmount = {
      grams: Number(entry.grams),
      quantity: entry.quantity === null ? null : Number(entry.quantity),
      portionLabel: entry.portion_label,
    };
    if (amountChanged(logged, amount.value)) changes = { ...changes, ...amountColumns(food, amount.value) };
  }

  const { data, error } = await supabase
    .from("food_entries")
    .update(changes)
    .eq("id", input.entryId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[diary] update failed", error.code, error.message);
    return failed(formData, error ? t.errors.saveFailed : t.errors.entryMissing);
  }

  refresh();
  return SAVED;
}

/** Deletes one of the caller's entries. */
export async function deleteEntry(entryId: number): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t.errors.unauthorized };
  const id = entryIdSchema.safeParse(entryId);
  if (!id.success) return { ok: false, error: t.errors.deleteFailed };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("food_entries")
    .delete()
    .eq("id", id.data)
    .eq("user_id", user.id)
    .select("id");
  if (error) {
    console.error("[diary] delete failed", error.code, error.message);
    return { ok: false, error: t.errors.deleteFailed };
  }
  if (data.length === 0) return { ok: false, error: t.errors.entryMissing };

  refresh();
  return { ok: true, data: undefined };
}
