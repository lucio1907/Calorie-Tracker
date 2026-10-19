import { z } from "zod";
import type { CalendarDate } from "@/domain";
import { isDiaryDate } from "@/features/diary/lib/diary-date";
import { toDecimal } from "@/features/foods/lib/food-schema";
import { WEIGHT_LIMITS } from "@/features/settings/lib/weight-entry";
import { progressStrings } from "../strings";
import type { WeightFieldErrors, WeightFormValues } from "./types";

const v = progressStrings.validation;

/** Positive integer id (bigint identity columns stay well inside the safe range). */
export const weightEntryIdSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export type WeightEntryInput = { date: CalendarDate; kg: number };
export type UpdateWeightEntryInput = WeightEntryInput & { entryId: number };

export type ParseWeightEntryResult<T> =
  | { ok: true; value: T }
  | { ok: false; fieldErrors: WeightFieldErrors; formError: string; values: WeightFormValues };

/** The visible fields as typed, echoed back after a failed submit. */
export function readWeightFormValues(formData: FormData): WeightFormValues {
  const values: WeightFormValues = {};
  for (const name of ["date", "kg"] as const) {
    const raw = formData.get(name);
    if (typeof raw === "string") values[name] = raw;
  }
  return values;
}

/** kg text (a decimal comma is fine) -> kg with 2 decimals inside WEIGHT_LIMITS. */
export function parseKg(raw: FormDataEntryValue | null): { ok: true; value: number } | { ok: false; error: string } {
  const value = toDecimal(raw);
  if (value === undefined) return { ok: false, error: v.required };
  if (typeof value !== "number" || !Number.isFinite(value)) return { ok: false, error: v.number };
  const { min, max } = WEIGHT_LIMITS;
  if (value < min || value > max) return { ok: false, error: v.weightRange(min, max) };
  return { ok: true, value: Math.round(value * 100) / 100 };
}

/** A supported calendar date that is not after `today` (the server's app-time-zone day). */
export function parseWeightDate(
  raw: FormDataEntryValue | null,
  today: CalendarDate,
): { ok: true; value: CalendarDate } | { ok: false; error: string } {
  if (typeof raw !== "string" || raw === "") return { ok: false, error: v.date };
  if (!isDiaryDate(raw)) return { ok: false, error: v.date };
  if (raw > today) return { ok: false, error: v.futureDate };
  return { ok: true, value: raw };
}

function fields(formData: FormData, today: CalendarDate): ParseWeightEntryResult<WeightEntryInput> {
  const date = parseWeightDate(formData.get("date"), today);
  const kg = parseKg(formData.get("kg"));
  if (date.ok && kg.ok) return { ok: true, value: { date: date.value, kg: kg.value } };

  const fieldErrors: WeightFieldErrors = {};
  if (!date.ok) fieldErrors.date = date.error;
  if (!kg.ok) fieldErrors.kg = kg.error;
  return { ok: false, fieldErrors, formError: v.fix, values: readWeightFormValues(formData) };
}

/** Reads and validates the "log weight" form (date + kg). */
export function parseWeightEntryForm(formData: FormData, today: CalendarDate): ParseWeightEntryResult<WeightEntryInput> {
  return fields(formData, today);
}

/** Reads and validates the "edit weight" form (hidden entryId, date + kg). */
export function parseUpdateWeightEntryForm(
  formData: FormData,
  today: CalendarDate,
): ParseWeightEntryResult<UpdateWeightEntryInput> {
  const entryId = weightEntryIdSchema.safeParse(formData.get("entryId"));
  // A hidden field the UI always fills: a bad value is tampering, not a typo.
  if (!entryId.success) {
    return { ok: false, fieldErrors: {}, formError: progressStrings.errors.unexpected, values: readWeightFormValues(formData) };
  }
  const parsed = fields(formData, today);
  return parsed.ok ? { ok: true, value: { ...parsed.value, entryId: entryId.data } } : parsed;
}
