import { z } from "zod";
import type { CalendarDate } from "@/domain";
import { diaryDateSchema } from "@/features/diary/lib/diary-date";
import { toDecimal } from "@/features/foods/lib/food-schema";
import { activityStrings } from "../strings";
import type { ActivityFieldErrors, ActivityFormValues } from "./types";

const v = activityStrings.validation;

/** Longest single entry, in whole minutes (activity_entries.minutes allows up to 1440). */
export const MAX_ACTIVITY_MINUTES = 1440;

/** Positive integer id (bigint identity columns stay well inside the safe range). */
export const activityIdSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export type CreateActivityInput = { date: CalendarDate; activityId: number; minutes: number };
export type UpdateActivityInput = { entryId: number; minutes: number };

export type ParseActivityResult<T> =
  | { ok: true; value: T }
  | { ok: false; fieldErrors: ActivityFieldErrors; formError: string; values: ActivityFormValues };

/** The visible fields as typed, echoed back after a failed submit. */
export function readActivityFormValues(formData: FormData): ActivityFormValues {
  const minutes = formData.get("minutes");
  return typeof minutes === "string" ? { minutes } : {};
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

function tampered(formData: FormData): ParseActivityResult<never> {
  return { ok: false, fieldErrors: {}, formError: activityStrings.errors.unexpected, values: readActivityFormValues(formData) };
}

function invalidMinutes(formData: FormData, error: string): ParseActivityResult<never> {
  return { ok: false, fieldErrors: { minutes: error }, formError: v.fix, values: readActivityFormValues(formData) };
}

/** Reads and validates the "log activity" form (hidden date + activityId, visible minutes). */
export function parseCreateActivityForm(formData: FormData): ParseActivityResult<CreateActivityInput> {
  const date = diaryDateSchema.safeParse(formData.get("date"));
  const activityId = activityIdSchema.safeParse(formData.get("activityId"));
  // Hidden fields the UI always fills: a bad value is tampering, not a typo.
  if (!date.success || !activityId.success) return tampered(formData);

  const minutes = parseMinutes(formData.get("minutes"));
  if (!minutes.ok) return invalidMinutes(formData, minutes.error);
  return { ok: true, value: { date: date.data, activityId: activityId.data, minutes: minutes.value } };
}

/** Reads and validates the "edit activity" form (hidden entryId, visible minutes). */
export function parseUpdateActivityForm(formData: FormData): ParseActivityResult<UpdateActivityInput> {
  const entryId = activityIdSchema.safeParse(formData.get("entryId"));
  if (!entryId.success) return tampered(formData);

  const minutes = parseMinutes(formData.get("minutes"));
  if (!minutes.ok) return invalidMinutes(formData, minutes.error);
  return { ok: true, value: { entryId: entryId.data, minutes: minutes.value } };
}
