import type { CalendarDate } from "@/domain";

/** One logged body weight (one per user per date). */
export type WeightEntry = { id: number; date: CalendarDate; kg: number };

/** Food and exercise kcal summed for one day (days without entries are absent). */
export type DailyEnergy = { date: CalendarDate; foodKcal: number; exerciseKcal: number };

export type WeightFieldName = "date" | "kg";
export type WeightFieldErrors = Partial<Record<WeightFieldName, string>>;
export type WeightFormValues = Partial<Record<WeightFieldName, string>>;

/** useActionState state for the log / edit weight form. */
export type WeightEntryFormState = {
  status: "idle" | "error" | "saved";
  fieldErrors: WeightFieldErrors;
  formError: string | null;
  /** What the user typed, echoed back after a failed submit. */
  values: WeightFormValues;
};

export const initialWeightEntryFormState: WeightEntryFormState = {
  status: "idle",
  fieldErrors: {},
  formError: null,
  values: {},
};
