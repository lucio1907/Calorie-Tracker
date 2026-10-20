import {
  ACTIVITY_LEVELS,
  addYears,
  DEFAULT_CARB_FAT_SPLIT,
  GOALS,
  isCalendarDate,
  MIN_AGE_YEARS,
  PROTEIN_G_PER_KG,
  SEXES,
  type ActivityLevel,
  type CalendarDate,
  type Goal,
  type Sex,
} from "@/domain";
import { toDecimal } from "@/features/foods/lib/food-schema";
import { settingsStrings } from "../strings";
import type {
  ProfileFieldErrors,
  ProfileFieldName,
  ProfileFormValues,
  ProfileValues,
  StoredProfile,
} from "./types";

const v = settingsStrings.validation;

/**
 * Form limits. They sit inside the CHECK constraints on public.profiles
 * (height 0-300 cm, rate 0-1.5 kg/week, birth date after 1900-01-01,
 * protein 0.8-3.0 g/kg with one decimal, carbs/fat percentages 0-100 adding
 * up to 100) and are a bit stricter where the database bound would accept an
 * obvious typo. Users must be adults
 * (MIN_AGE_YEARS): the target formulas are adult guidelines.
 */
export const PROFILE_LIMITS = {
  heightCm: { min: 50, max: 250 },
  goalKgPerWeek: { min: 0.05, max: 1.5 },
  proteinGPerKg: { min: PROTEIN_G_PER_KG.min, max: PROTEIN_G_PER_KG.max },
  /** Exclusive lower bound, as in the column check. */
  birthDateAfter: "1900-01-01",
  minAgeYears: MIN_AGE_YEARS,
} as const;

/** Latest birth date of someone at least the minimum age on `today`. */
export function latestBirthDate(today: CalendarDate): CalendarDate {
  return addYears(today, -PROFILE_LIMITS.minAgeYears);
}

/** profiles column defaults, used before the row exists. */
const COLUMN_DEFAULTS = {
  goal: "maintain",
  proteinGPerKg: PROTEIN_G_PER_KG.default,
  carbsSharePct: DEFAULT_CARB_FAT_SPLIT.carbs,
  fatSharePct: DEFAULT_CARB_FAT_SPLIT.fat,
} as const;

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function text(raw: FormDataEntryValue | null): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function oneOf<T extends string>(options: readonly T[], raw: FormDataEntryValue | null): Parsed<T> {
  const value = options.find((option) => option === raw);
  return value === undefined ? { ok: false, error: v.required } : { ok: true, value };
}

/** Text -> number; "" is "required", anything unparseable is "enter a number". */
function parseNumber(raw: FormDataEntryValue | null): Parsed<number> {
  const value = toDecimal(typeof raw === "string" ? raw : undefined);
  if (value === undefined) return { ok: false, error: v.required };
  return typeof value === "number" && Number.isFinite(value) ? { ok: true, value } : { ok: false, error: v.number };
}

function inRange(parsed: Parsed<number>, min: number, max: number, error: string): Parsed<number> {
  if (!parsed.ok) return parsed;
  return parsed.value >= min && parsed.value <= max ? parsed : { ok: false, error };
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function parseBirthDate(raw: FormDataEntryValue | null, today: CalendarDate): Parsed<CalendarDate> {
  const value = text(raw);
  if (value === "") return { ok: false, error: v.required };
  if (!isCalendarDate(value)) return { ok: false, error: v.date };
  if (value <= PROFILE_LIMITS.birthDateAfter) return { ok: false, error: v.birthDateRange };
  if (value > latestBirthDate(today)) return { ok: false, error: v.minAge(PROFILE_LIMITS.minAgeYears) };
  return { ok: true, value };
}

function parsePercentage(raw: FormDataEntryValue | null): Parsed<number> {
  const parsed = parseNumber(raw);
  if (!parsed.ok) return parsed;
  if (!Number.isInteger(parsed.value)) return { ok: false, error: v.wholeNumber };
  return inRange(parsed, 0, 100, v.pctRange);
}

/**
 * Protein in g/kg: within the range and with at most one decimal (the column
 * is numeric(2, 1), which would silently round a second decimal).
 */
function parseProteinGPerKg(raw: FormDataEntryValue | null): Parsed<number> {
  const { min, max } = PROFILE_LIMITS.proteinGPerKg;
  const parsed = inRange(parseNumber(raw), min, max, v.proteinRange(min, max));
  if (!parsed.ok) return parsed;
  const tenths = parsed.value * 10;
  return Math.abs(tenths - Math.round(tenths)) < 1e-9
    ? { ok: true, value: roundTo(parsed.value, 1) }
    : { ok: false, error: v.proteinRange(min, max) };
}

/** Weekly rate for the goal: required for lose/gain, always 0 while maintaining. */
function parseRate(goal: Parsed<Goal>, raw: FormDataEntryValue | null): Parsed<number> {
  if (!goal.ok || goal.value === "maintain") return { ok: true, value: 0 };
  const { min, max } = PROFILE_LIMITS.goalKgPerWeek;
  const parsed = inRange(parseNumber(raw), min, max, v.rateRange(min, max));
  return parsed.ok ? { ok: true, value: roundTo(parsed.value, 2) } : parsed;
}

export type ParseProfileResult =
  | { ok: true; value: ProfileValues }
  | { ok: false; fieldErrors: ProfileFieldErrors; formError: string };

/**
 * Reads and validates the profile form. `today` (the app's calendar day)
 * bounds the birth date. Unknown fields are ignored.
 */
export function parseProfileForm(formData: FormData, today: CalendarDate): ParseProfileResult {
  const { min: minHeight, max: maxHeight } = PROFILE_LIMITS.heightCm;
  const goal = oneOf<Goal>(GOALS, formData.get("goal"));
  const height = inRange(parseNumber(formData.get("heightCm")), minHeight, maxHeight, v.heightRange(minHeight, maxHeight));

  const fields = {
    sex: oneOf<Sex>(SEXES, formData.get("sex")),
    birthDate: parseBirthDate(formData.get("birthDate"), today),
    heightCm: height.ok ? { ok: true as const, value: roundTo(height.value, 1) } : height,
    activityLevel: oneOf<ActivityLevel>(ACTIVITY_LEVELS, formData.get("activityLevel")),
    goal,
    goalKgPerWeek: parseRate(goal, formData.get("goalKgPerWeek")),
    proteinGPerKg: parseProteinGPerKg(formData.get("proteinGPerKg")),
    carbsSharePct: parsePercentage(formData.get("carbsSharePct")),
    fatSharePct: parsePercentage(formData.get("fatSharePct")),
  } satisfies Record<ProfileFieldName, Parsed<unknown>>;

  const fieldErrors: ProfileFieldErrors = {};
  for (const [name, parsed] of Object.entries(fields) as Array<[ProfileFieldName, Parsed<unknown>]>) {
    if (!parsed.ok) fieldErrors[name] = parsed.error;
  }

  const { sex, birthDate, heightCm, activityLevel, goalKgPerWeek, proteinGPerKg, carbsSharePct, fatSharePct } = fields;
  if (carbsSharePct.ok && fatSharePct.ok) {
    const total = carbsSharePct.value + fatSharePct.value;
    if (total !== 100) fieldErrors.carbFatSplit = v.splitTotal(total);
  }

  if (
    Object.keys(fieldErrors).length > 0 ||
    !sex.ok ||
    !birthDate.ok ||
    !heightCm.ok ||
    !activityLevel.ok ||
    !goal.ok ||
    !goalKgPerWeek.ok ||
    !proteinGPerKg.ok ||
    !carbsSharePct.ok ||
    !fatSharePct.ok
  ) {
    return { ok: false, fieldErrors, formError: v.fix };
  }

  return {
    ok: true,
    value: {
      sex: sex.value,
      birthDate: birthDate.value,
      heightCm: heightCm.value,
      activityLevel: activityLevel.value,
      goal: goal.value,
      goalKgPerWeek: goalKgPerWeek.value,
      proteinGPerKg: proteinGPerKg.value,
      carbFatSplit: { carbs: carbsSharePct.value, fat: fatSharePct.value },
    },
  };
}

/** Sum of the carbs and fat percentages as typed (blank counts as 0); null when one is not a number. */
export function carbFatSplitTotal(values: Pick<ProfileFormValues, "carbsSharePct" | "fatSharePct">): number | null {
  let total = 0;
  for (const raw of [values.carbsSharePct, values.fatSharePct]) {
    const value = toDecimal(raw);
    if (value === undefined) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    total += value;
  }
  return total;
}

function known<T extends string>(options: readonly T[], value: string | null): T | "" {
  return options.find((option) => option === value) ?? "";
}

/** Initial form text: the stored profile, or the column defaults before the row exists. */
export function profileFormDefaults(profile: StoredProfile | null): ProfileFormValues {
  if (profile === null) {
    return {
      sex: "",
      birthDate: "",
      heightCm: "",
      activityLevel: "",
      goal: COLUMN_DEFAULTS.goal,
      goalKgPerWeek: "",
      proteinGPerKg: String(COLUMN_DEFAULTS.proteinGPerKg),
      carbsSharePct: String(COLUMN_DEFAULTS.carbsSharePct),
      fatSharePct: String(COLUMN_DEFAULTS.fatSharePct),
    };
  }

  const goal = known(GOALS, profile.goal) || COLUMN_DEFAULTS.goal;
  return {
    sex: known(SEXES, profile.sex),
    birthDate: profile.birthDate ?? "",
    heightCm: profile.heightCm === null ? "" : String(profile.heightCm),
    activityLevel: known(ACTIVITY_LEVELS, profile.activityLevel),
    goal,
    goalKgPerWeek: goal === "maintain" || profile.goalKgPerWeek <= 0 ? "" : String(profile.goalKgPerWeek),
    proteinGPerKg: String(profile.proteinGPerKg),
    carbsSharePct: String(profile.carbsSharePct),
    fatSharePct: String(profile.fatSharePct),
  };
}
