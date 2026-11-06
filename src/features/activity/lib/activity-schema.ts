import { z } from "zod";
import type { CalendarDate } from "@/domain";
import { diaryDateSchema } from "@/features/diary/lib/diary-date";
import { toDecimal } from "@/features/foods/lib/food-schema";
import { activityStrings } from "../strings";
import { MAX_ENTRY_KCAL } from "./activity-kcal";
import type { ActivityFieldErrors, ActivityFormValues } from "./types";

const v = activityStrings.validation;

/** Longest single entry, in whole minutes (activity_entries.minutes allows up to 1440). */
export const MAX_ACTIVITY_MINUTES = 1440;

/** Largest whole kcal a user can type for one entry. */
export const MAX_MANUAL_KCAL = Math.floor(MAX_ENTRY_KCAL);

/** Positive integer id (bigint identity columns stay well inside the safe range). */
export const activityIdSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

/** `manualKcal` is what the user typed; null means use the MET estimate. */
export type CreateActivityInput = { date: CalendarDate; activityId: number; minutes: number; manualKcal: number | null };
export type UpdateActivityInput = { entryId: number; minutes: number; manualKcal: number | null };

export type ParseActivityResult<T> =
  | { ok: true; value: T }
  | { ok: false; fieldErrors: ActivityFieldErrors; formError: string; values: ActivityFormValues };

/** The visible fields as typed, echoed back after a failed submit. */
export function readActivityFormValues(formData: FormData): ActivityFormValues {
  const values: ActivityFormValues = {};
  for (const name of ["minutes", "manualKcal"] as const) {
    const value = formData.get(name);
    if (typeof value === "string") values[name] = value;
  }
  return values;
}

/** Minutes text -> whole minutes in 1..MAX_ACTIVITY_MINUTES. */
export function parseMinutes(raw: FormDataEntryValue | null): { ok: true; value: number } | { ok: false; error: string } {
  const value = toDecimal(raw);
  if (value === undefined) return { ok: false, error: v.required };
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    return { ok: false, error: v.wholeMinutes };
  }
  return value >= 1 && value <= MAX_ACTIVITY_MINUTES
    ? { ok: true, value }
    : { ok: false, error: v.minutesRange(MAX_ACTIVITY_MINUTES) };
}

/** Whole kcal written with a thousands separator ("1.200"), which toDecimal reads as a decimal. */
const THOUSANDS_PATTERN = /^\d{1,2}[.,]\d{3}$/;

/** Optional kcal text -> whole kcal in 1..MAX_MANUAL_KCAL, or null when left blank. */
export function parseManualKcal(
  raw: FormDataEntryValue | null,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const text = typeof raw === "string" ? raw.trim() : raw;
  const value = toDecimal(typeof text === "string" && THOUSANDS_PATTERN.test(text) ? text.replace(/[.,]/, "") : text);
  if (value === undefined) return { ok: true, value: null };
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    return { ok: false, error: v.wholeKcal };
  }
  return value >= 1 && value <= MAX_MANUAL_KCAL
    ? { ok: true, value }
    : { ok: false, error: v.kcalRange(MAX_MANUAL_KCAL) };
}

function tampered(formData: FormData): ParseActivityResult<never> {
  return { ok: false, fieldErrors: {}, formError: activityStrings.errors.unexpected, values: readActivityFormValues(formData) };
}

/** The visible fields, validated together so every mistake is reported at once. */
function parseVisibleFields(
  formData: FormData,
): ParseActivityResult<{ minutes: number; manualKcal: number | null }> {
  const minutes = parseMinutes(formData.get("minutes"));
  const manualKcal = parseManualKcal(formData.get("manualKcal"));
  if (minutes.ok && manualKcal.ok) return { ok: true, value: { minutes: minutes.value, manualKcal: manualKcal.value } };

  const fieldErrors: ActivityFieldErrors = {};
  if (!minutes.ok) fieldErrors.minutes = minutes.error;
  if (!manualKcal.ok) fieldErrors.manualKcal = manualKcal.error;
  return { ok: false, fieldErrors, formError: v.fix, values: readActivityFormValues(formData) };
}

/** Reads and validates the "log activity" form (hidden date + activityId, visible minutes + manualKcal). */
export function parseCreateActivityForm(formData: FormData): ParseActivityResult<CreateActivityInput> {
  const date = diaryDateSchema.safeParse(formData.get("date"));
  const activityId = activityIdSchema.safeParse(formData.get("activityId"));
  // Hidden fields the UI always fills: a bad value is tampering, not a typo.
  if (!date.success || !activityId.success) return tampered(formData);

  const fields = parseVisibleFields(formData);
  if (!fields.ok) return fields;
  return { ok: true, value: { date: date.data, activityId: activityId.data, ...fields.value } };
}

/** Reads and validates the "edit activity" form (hidden entryId, visible minutes + manualKcal). */
export function parseUpdateActivityForm(formData: FormData): ParseActivityResult<UpdateActivityInput> {
  const entryId = activityIdSchema.safeParse(formData.get("entryId"));
  if (!entryId.success) return tampered(formData);

  const fields = parseVisibleFields(formData);
  if (!fields.ok) return fields;
  return { ok: true, value: { entryId: entryId.data, ...fields.value } };
}
