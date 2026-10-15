import type { ActivityLevel, CalendarDate, Goal, Sex } from "@/domain";

export type ProfileFieldName =
  | "sex"
  | "birthDate"
  | "heightCm"
  | "activityLevel"
  | "goal"
  | "goalKgPerWeek"
  | "proteinPct"
  | "carbsPct"
  | "fatPct";

/** Field errors, plus `macroSplit` for a split that does not add up to 100. */
export type ProfileFieldErrors = Partial<Record<ProfileFieldName | "macroSplit", string>>;

/** The profile form's fields as text (what the inputs hold). */
export type ProfileFormValues = Record<ProfileFieldName, string>;

/** A validated profile, ready to store. */
export type ProfileValues = {
  sex: Sex;
  birthDate: CalendarDate;
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  /** Magnitude in kg/week; 0 while maintaining. */
  goalKgPerWeek: number;
  macroSplit: { protein: number; carbs: number; fat: number };
};

/** The stored profile row, as the settings screen reads it. */
export type StoredProfile = {
  sex: string | null;
  birthDate: string | null;
  heightCm: number | null;
  activityLevel: string | null;
  goal: string;
  goalKgPerWeek: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
};

/** useActionState state for the profile form (its inputs are controlled, so no values echo). */
export type ProfileFormState = {
  status: "idle" | "error" | "saved";
  fieldErrors: ProfileFieldErrors;
  formError: string | null;
};

export const initialProfileFormState: ProfileFormState = { status: "idle", fieldErrors: {}, formError: null };

/** Latest logged weight on or before today. */
export type LatestWeight = { kg: number; date: CalendarDate };

/** useActionState state for the weight form. */
export type WeightFormState = {
  status: "idle" | "error" | "saved";
  fieldError: string | null;
  formError: string | null;
  /** What the user typed, echoed back after a failed submit. */
  value: string;
};

export const initialWeightFormState: WeightFormState = { status: "idle", fieldError: null, formError: null, value: "" };
