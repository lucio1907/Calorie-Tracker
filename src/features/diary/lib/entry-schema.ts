import { z } from "zod";
import { MAX_ENTRY_GRAMS, MEALS, type CalendarDate, type Meal } from "@/domain";
import { LIMITS, toDecimal } from "@/features/foods/lib/food-schema";
import { diaryStrings } from "../strings";
import { diaryDateSchema } from "./diary-date";
import { MAX_PORTION_QUANTITY, parseUnit, toUnitGrams, type EntryUnit, type UnitChoice } from "./entry-amount";
import type { EntryFieldErrors, EntryFieldName, EntryFormValues } from "./types";

const v = diaryStrings.validation;

/** Positive integer id (bigint identity columns stay well inside the safe range). */
const idSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export const entryIdSchema = idSchema;

const mealSchema = z.enum(MEALS as [Meal, ...Meal[]]);

const decimalSchema = z.preprocess(
  toDecimal,
  z.number({ error: (issue) => (issue.input === undefined ? v.required : v.number) }),
);

/** What is logged: a food, or a recipe (logged like a food whose portion is one serving). */
export type EntrySource = { kind: "food"; foodId: number } | { kind: "recipe"; recipeId: number };

export type CreateEntryInput = {
  date: CalendarDate;
  meal: Meal;
  source: EntrySource;
  unit: EntryUnit;
  amount: number;
};

export type UpdateEntryInput = {
  entryId: number;
  meal: Meal;
  /** New amount; null keeps the logged amount (entries whose food was deleted). */
  change: { unit: EntryUnit; amount: number } | null;
};

export type ParseEntryResult<T> =
  | { ok: true; value: T }
  | { ok: false; fieldErrors: EntryFieldErrors; formError: string; values: EntryFormValues };

const VISIBLE_FIELDS: EntryFieldName[] = ["meal", "unit", "amount", "unitGrams"];

/** The visible fields as typed, echoed back after a failed submit. */
export function readEntryFormValues(formData: FormData): EntryFormValues {
  const values: EntryFormValues = {};
  for (const field of VISIBLE_FIELDS) {
    const raw = formData.get(field);
    if (typeof raw === "string") values[field] = raw;
  }
  return values;
}

/** Amount text -> number within the range of its unit (grams or portion count). */
function parseAmount(raw: unknown, unit: UnitChoice): { ok: true; value: number } | { ok: false; error: string } {
  const parsed = decimalSchema.safeParse(raw ?? undefined);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? v.number };
  const amount = parsed.data;
  const [max, message] =
    unit.kind === "grams" ? [MAX_ENTRY_GRAMS, v.gramsRange(MAX_ENTRY_GRAMS)] : [MAX_PORTION_QUANTITY, v.quantityRange];
  return amount > 0 && amount <= max ? { ok: true, value: amount } : { ok: false, error: message };
}

/** Weight of one unit being defined: the bounds of a food portion, rounded to 2 decimals. */
function parseUnitGrams(raw: unknown): { ok: true; value: number } | { ok: false; error: string } {
  const parsed = decimalSchema.safeParse(raw ?? undefined);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? v.number };
  const grams = toUnitGrams(parsed.data);
  return grams !== null ? { ok: true, value: grams } : { ok: false, error: v.gramsRange(LIMITS.portionGrams.max) };
}

type Fields = { meal: Meal | null; unit: EntryUnit | null; amount: number | null; fieldErrors: EntryFieldErrors };

/** Validates meal + amount (+ the weight of a unit being defined); hidden fields are checked by the callers. */
function parseVisible(formData: FormData, choice: UnitChoice | null): Fields {
  const fieldErrors: EntryFieldErrors = {};
  const meal = mealSchema.safeParse(formData.get("meal"));
  if (!meal.success) fieldErrors.meal = v.required;

  let amount: number | null = null;
  let unit: EntryUnit | null = null;
  if (choice) {
    const parsed = parseAmount(formData.get("amount"), choice);
    if (parsed.ok) amount = parsed.value;
    else fieldErrors.amount = parsed.error;

    if (choice.kind === "newUnit") {
      const grams = parseUnitGrams(formData.get("unitGrams"));
      if (grams.ok) unit = { kind: "newUnit", grams: grams.value };
      else fieldErrors.unitGrams = grams.error;
    } else {
      unit = choice;
    }
  }
  return { meal: meal.success ? meal.data : null, unit, amount, fieldErrors };
}

function tampered(formData: FormData): ParseEntryResult<never> {
  return { ok: false, fieldErrors: {}, formError: diaryStrings.errors.unexpected, values: readEntryFormValues(formData) };
}

function invalid(formData: FormData, fieldErrors: EntryFieldErrors): ParseEntryResult<never> {
  return { ok: false, fieldErrors, formError: v.fix, values: readEntryFormValues(formData) };
}

/** Exactly one of the hidden foodId / recipeId fields, as a positive id. */
function parseSource(formData: FormData): EntrySource | null {
  const rawFood = formData.get("foodId");
  const rawRecipe = formData.get("recipeId");
  if ((rawFood === null) === (rawRecipe === null)) return null;
  const id = idSchema.safeParse(rawFood ?? rawRecipe);
  if (!id.success) return null;
  return rawFood !== null ? { kind: "food", foodId: id.data } : { kind: "recipe", recipeId: id.data };
}

/** Reads and validates the "add entry" form. */
export function parseCreateEntryForm(formData: FormData): ParseEntryResult<CreateEntryInput> {
  const date = diaryDateSchema.safeParse(formData.get("date"));
  const source = parseSource(formData);
  const choice = parseUnit(formData.get("unit"));
  // Hidden fields or a <select> value the UI never renders (recipes have no "unidad"): not the user's typo.
  if (!date.success || !source || !choice || (choice.kind === "newUnit" && source.kind === "recipe")) {
    return tampered(formData);
  }

  const { meal, unit, amount, fieldErrors } = parseVisible(formData, choice);
  if (meal === null || unit === null || amount === null) return invalid(formData, fieldErrors);
  return { ok: true, value: { date: date.data, meal, source, unit, amount } };
}

/** Reads and validates the "edit entry" form. Without a unit field only the meal changes. */
export function parseUpdateEntryForm(formData: FormData): ParseEntryResult<UpdateEntryInput> {
  const entryId = idSchema.safeParse(formData.get("entryId"));
  const rawUnit = formData.get("unit");
  const choice = rawUnit === null ? null : parseUnit(rawUnit);
  if (!entryId.success || (rawUnit !== null && !choice)) return tampered(formData);

  const { meal, unit, amount, fieldErrors } = parseVisible(formData, choice);
  if (meal === null || (choice && (unit === null || amount === null))) return invalid(formData, fieldErrors);
  return {
    ok: true,
    value: { entryId: entryId.data, meal, change: unit && amount !== null ? { unit, amount } : null },
  };
}
