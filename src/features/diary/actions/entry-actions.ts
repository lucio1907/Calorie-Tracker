"use server";

import { refresh } from "next/cache";
import { MAX_ENTRY_GRAMS, nutrientSnapshot } from "@/domain";
import { getCurrentUser } from "@/features/auth/data/current-user";
import { getFoodDetail } from "@/features/foods/data/foods";
import { formatAmount } from "@/features/foods/lib/format";
import type { ActionResult } from "@/features/foods/lib/types";
import { getRecipe } from "@/features/recipes/data/recipes";
import type { Database } from "@/lib/supabase/database.types";
import { isRowQuotaViolation } from "@/lib/supabase/row-quota";
import { createClient } from "@/lib/supabase/server";
import {
  amountChanged,
  findUnitPortion,
  resolveEntryAmount,
  UNIT_LABEL,
  type AmountError,
  type EntryUnit,
  type PortionOption,
} from "../lib/entry-amount";
import { entryLabel } from "../lib/entry-label";
import {
  entryIdSchema,
  parseCreateEntryForm,
  parseUpdateEntryForm,
  readEntryFormValues,
  type EntrySource,
  type ParseEntryResult,
} from "../lib/entry-schema";
import { recipeAsFood, recipeProblemMessage, type LoggableFood } from "../lib/recipe-food";
import type { EntryAmount, EntryFormState } from "../lib/types";
import { diaryStrings as t } from "../strings";

/*
 * Diary mutations. The client sends only ids, a meal, a unit and an amount:
 * grams and the nutrient snapshot are always computed here from the food (or
 * the recipe's ingredients) as stored (RLS decides what the caller can see),
 * never taken from the browser. Each action re-checks the session and scopes writes to the
 * caller; RLS enforces the same rules again.
 * Logging by "unidad" for the first time also saves the caller's unit
 * (food_portions row owned by them; on their own food, a regular portion)
 * before the entry, so it shows up as a normal option next time.
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

/** What an entry logs, loaded as stored: the food or recipe, its soft link and its label. */
type Loaded =
  | {
      ok: true;
      food: LoggableFood;
      link: { food_id: number } | { recipe_id: number };
      label: string;
      /** The food belongs to the caller (false for recipes and shared foods). */
      ownFood: boolean;
    }
  | { ok: false; error: string };

type LoadedSource = Extract<Loaded, { ok: true }>;

async function loadSource(source: EntrySource, userId: string): Promise<Loaded> {
  try {
    if (source.kind === "food") {
      const food = await getFoodDetail(source.foodId, userId);
      if (!food) return { ok: false, error: t.errors.foodMissing };
      return { ok: true, food, link: { food_id: food.id }, label: entryLabel(food), ownFood: food.isOwn };
    }
    const recipe = await getRecipe(source.recipeId, userId);
    if (!recipe) return { ok: false, error: t.errors.recipeMissing };
    const asFood = recipeAsFood(recipe);
    if (!asFood.ok) return { ok: false, error: recipeProblemMessage(asFood.error) };
    return {
      ok: true,
      food: asFood.food,
      link: { recipe_id: recipe.id },
      label: entryLabel({ name: recipe.name, brand: null }),
      ownFood: false,
    };
  } catch (error) {
    console.error("[diary] source lookup failed", error);
    return { ok: false, error: source.kind === "food" ? t.errors.foodMissing : t.errors.recipeMissing };
  }
}

type EntryUpdate = Database["public"]["Tables"]["food_entries"]["Update"];

/** Grams + snapshot columns for `amount` of `food`. */
function amountColumns(food: LoggableFood, amount: EntryAmount) {
  return {
    grams: amount.grams,
    quantity: amount.quantity,
    portion_label: amount.portionLabel,
    ...nutrientSnapshot(food, amount.grams),
  };
}

const UNIQUE_VIOLATION = "23505";

type SaveUnitResult = { ok: true; portion: PortionOption } | { ok: false; error: string };

/**
 * A unit the caller already has (a stale form, or saved meanwhile) is only
 * used when it weighs what they typed, so the entry never logs a total other
 * than the one the form previewed.
 */
function storedUnitResult(stored: PortionOption, grams: number): SaveUnitResult {
  if (stored.grams === grams) return { ok: true, portion: stored };
  return { ok: false, error: t.errors.unitWeightDiffers(formatAmount(stored.grams)) };
}

/**
 * The caller's "unidad" for a food: the one they already have (a stale form),
 * or a new one weighing `grams`. On their own food it is a regular portion
 * (owner_id null), on a shared food a unit only they see (owner_id = caller).
 */
async function saveUnit(foodId: number, source: LoadedSource, grams: number, userId: string): Promise<SaveUnitResult> {
  const existing = findUnitPortion(source.food.portions);
  if (existing) return storedUnitResult(existing, grams);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("food_portions")
    .insert({ food_id: foodId, label: UNIT_LABEL, grams, owner_id: source.ownFood ? null : userId })
    .select("id, label, grams")
    .single();
  if (data) return { ok: true, portion: { id: data.id, label: data.label, grams: Number(data.grams) } };

  if (error?.code === UNIQUE_VIOLATION) {
    // Saved meanwhile (e.g. another tab).
    const food = await getFoodDetail(foodId, userId).catch(() => null);
    const stored = food ? findUnitPortion(food.portions) : undefined;
    if (stored) return storedUnitResult(stored, grams);
  }
  if (isRowQuotaViolation(error)) return { ok: false, error: t.errors.unitLimit };
  console.error("[diary] unit insert failed", error?.code, error?.message);
  return { ok: false, error: t.errors.unitFailed };
}

type AmountResult = { ok: true; value: EntryAmount } | { ok: false; state: EntryFormState };

/**
 * Grams to log for `amount` of `unit`. A unit being defined is checked first
 * (no unit is saved for an entry that would be rejected), then saved, and the
 * entry uses the stored unit.
 */
async function amountToLog(
  source: LoadedSource,
  unit: EntryUnit,
  amount: number,
  userId: string,
  formData: FormData,
): Promise<AmountResult> {
  const checked = resolveEntryAmount(unit, amount, source.food.portions);
  if (!checked.ok) return { ok: false, state: amountFailed(formData, checked.error) };
  if (unit.kind !== "newUnit") return checked;

  // Only foods have units; the form never offers one for a recipe.
  if (!("food_id" in source.link)) return { ok: false, state: failed(formData, t.errors.unexpected) };
  const saved = await saveUnit(source.link.food_id, source, unit.grams, userId);
  if (!saved.ok) return { ok: false, state: failed(formData, saved.error) };

  const logged = resolveEntryAmount({ kind: "portion", portionId: saved.portion.id }, amount, [saved.portion]);
  return logged.ok ? logged : { ok: false, state: amountFailed(formData, logged.error) };
}

/** Form action: logs `amount` of a food or recipe into a meal on a date. */
export async function createEntry(_previous: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const user = await getCurrentUser();
  if (!user) return failed(formData, t.errors.unauthorized);

  const parsed = parseCreateEntryForm(formData);
  if (!parsed.ok) return invalid(parsed);
  const input = parsed.value;

  const source = await loadSource(input.source, user.id);
  if (!source.ok) return failed(formData, source.error);

  const amount = await amountToLog(source, input.unit, input.amount, user.id, formData);
  if (!amount.ok) return amount.state;

  const supabase = await createClient();
  const { error } = await supabase.from("food_entries").insert({
    user_id: user.id,
    entry_date: input.date,
    meal: input.meal,
    ...source.link,
    label: source.label,
    ...amountColumns(source.food, amount.value),
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
 * The snapshot is recomputed (from the food or recipe as it is now) only
 * when the amount changes; a meal-only edit keeps the logged values untouched.
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
    .select("id, food_id, recipe_id, grams, quantity, portion_label")
    .eq("id", input.entryId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) return failed(formData, t.errors.saveFailed);
  if (!entry) return failed(formData, t.errors.entryMissing);

  let changes: EntryUpdate = { meal: input.meal };
  if (input.change) {
    const linked: EntrySource | null =
      entry.food_id !== null
        ? { kind: "food", foodId: entry.food_id }
        : entry.recipe_id !== null
          ? { kind: "recipe", recipeId: entry.recipe_id }
          : null;
    if (!linked) return failed(formData, t.errors.foodMissing);
    const source = await loadSource(linked, user.id);
    if (!source.ok) return failed(formData, source.error);

    const amount = await amountToLog(source, input.change.unit, input.change.amount, user.id, formData);
    if (!amount.ok) return amount.state;

    const logged: EntryAmount = {
      grams: Number(entry.grams),
      quantity: entry.quantity === null ? null : Number(entry.quantity),
      portionLabel: entry.portion_label,
    };
    if (amountChanged(logged, amount.value)) changes = { ...changes, ...amountColumns(source.food, amount.value) };
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
