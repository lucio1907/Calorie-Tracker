import type { CalendarDate } from "@/domain";

/** One row of the MET catalog the caller can see (shared rows plus their own). */
export type CatalogActivity = {
  id: number;
  name: string;
  met: number;
  category: string;
};

/** One logged activity with its kcal snapshot. */
export type ActivityEntry = {
  id: number;
  /** Soft link to the catalog row; null once a custom activity is deleted. */
  activityId: number | null;
  /** Activity name at log time. */
  label: string;
  minutes: number;
  kcal: number;
  /** True when the user typed the kcal; false when they are the MET estimate. */
  kcalIsManual: boolean;
};

/** The weight kcal are computed with: the latest one on or before the viewed day. */
export type ActivityWeight = { kg: number; date: CalendarDate };

/** useActionState state for the add / edit activity form. */
export type ActivityFormState = {
  status: "idle" | "error" | "saved";
  fieldErrors: ActivityFieldErrors;
  formError: string | null;
  /** True when the server found no weight to compute kcal with (the form links to Settings). */
  needsWeight: boolean;
  /** What the user typed, echoed back after a failed submit. */
  values: ActivityFormValues;
};

export type ActivityFieldName = "minutes" | "manualKcal";
export type ActivityFieldErrors = Partial<Record<ActivityFieldName, string>>;
export type ActivityFormValues = Partial<Record<ActivityFieldName, string>>;

export const initialActivityFormState: ActivityFormState = {
  status: "idle",
  fieldErrors: {},
  formError: null,
  needsWeight: false,
  values: {},
};
