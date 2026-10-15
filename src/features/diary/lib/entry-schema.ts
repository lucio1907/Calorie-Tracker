import { z } from "zod";
import { MAX_ENTRY_GRAMS, MEALS, type CalendarDate, type Meal } from "@/domain";
import { toDecimal } from "@/features/foods/lib/food-schema";
import { diaryStrings } from "../strings";
import { diaryDateSchema } from "./diary-date";
import { MAX_PORTION_QUANTITY, parseUnit, type EntryUnit } from "./entry-amount";
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

export type CreateEntryInput = {
  date: CalendarDate;
  meal: Meal;
  foodId: number;
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

const VISIBLE_FIELDS: EntryFieldName[] = ["meal", "unit", "amount"];

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
function parseAmount(raw: unknown, unit: EntryUnit): { ok: true; value: number } | { ok: false; error: string } {
  const parsed = decimalSchema.safeParse(raw ?? undefined);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? v.number };
  const amount = parsed.data;
  const [max, message] =
    unit.kind === "grams" ? [MAX_ENTRY_GRAMS, v.gramsRange(MAX_ENTRY_GRAMS)] : [MAX_PORTION_QUANTITY, v.quantityRange];
  return amount > 0 && amount <= max ? { ok: true, value: amount } : { ok: false, error: message };
}

type Fields = { meal: Meal | null; amount: number | null; fieldErrors: EntryFieldErrors };

/** Validates meal + amount; hidden fields are checked by the callers. */
function parseVisible(formData: FormData, unit: EntryUnit | null): Fields {
  const fieldErrors: EntryFieldErrors = {};
  const meal = mealSchema.safeParse(formData.get("meal"));
  if (!meal.success) fieldErrors.meal = v.required;

  let amount: number | null = null;
  if (unit) {
    const parsed = parseAmount(formData.get("amount"), unit);
    if (parsed.ok) amount = parsed.value;
    else fieldErrors.amount = parsed.error;
  }
  return { meal: meal.success ? meal.data : null, amount, fieldErrors };
}

function tampered(formData: FormData): ParseEntryResult<never> {
  return { ok: false, fieldErrors: {}, formError: diaryStrings.errors.unexpected, values: readEntryFormValues(formData) };
}

function invalid(formData: FormData, fieldErrors: EntryFieldErrors): ParseEntryResult<never> {
  return { ok: false, fieldErrors, formError: v.fix, values: readEntryFormValues(formData) };
}

/** Reads and validates the "add entry" form. */
export function parseCreateEntryForm(formData: FormData): ParseEntryResult<CreateEntryInput> {
  const date = diaryDateSchema.safeParse(formData.get("date"));
  const foodId = idSchema.safeParse(formData.get("foodId"));
  const unit = parseUnit(formData.get("unit"));
  // Hidden fields or a <select> value the UI never renders: not the user's typo.
  if (!date.success || !foodId.success || !unit) return tampered(formData);

  const { meal, amount, fieldErrors } = parseVisible(formData, unit);
  if (meal === null || amount === null) return invalid(formData, fieldErrors);
  return { ok: true, value: { date: date.data, meal, foodId: foodId.data, unit, amount } };
}

/** Reads and validates the "edit entry" form. Without a unit field only the meal changes. */
export function parseUpdateEntryForm(formData: FormData): ParseEntryResult<UpdateEntryInput> {
  const entryId = idSchema.safeParse(formData.get("entryId"));
  const rawUnit = formData.get("unit");
  const unit = rawUnit === null ? null : parseUnit(rawUnit);
  if (!entryId.success || (rawUnit !== null && !unit)) return tampered(formData);

  const { meal, amount, fieldErrors } = parseVisible(formData, unit);
  if (meal === null || (unit && amount === null)) return invalid(formData, fieldErrors);
  return {
    ok: true,
    value: { entryId: entryId.data, meal, change: unit && amount !== null ? { unit, amount } : null },
  };
}
