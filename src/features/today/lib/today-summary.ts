import {
  ACTIVITY_LEVELS,
  ageOnDate,
  applyCalorieFloor,
  calculateBmr,
  calculateTdee,
  calorieTarget,
  GOALS,
  isCalendarDate,
  MIN_AGE_YEARS,
  minimumDailyKcal,
  remainingKcal,
  SEXES,
  type ActivityLevel,
  type BmrInput,
  type CalendarDate,
  type Goal,
  type Nutrients,
  type Sex,
} from "@/domain";

export type Macros = { protein: number; carbs: number; fat: number };

/** Profile columns the daily target depends on, as stored (body fields stay null until set). */
export type TodayProfile = {
  sex: string | null;
  birthDate: string | null;
  heightCm: number | null;
  activityLevel: string | null;
  goal: string;
  /** Magnitude of the weekly weight change (the goal gives the sign). */
  goalKgPerWeek: number;
  /** Percent of the target per macro (sums to 100). */
  macroSplit: Macros;
};

/** Profile data the target needs, in display order. */
export type MissingProfileField = "sex" | "birthDate" | "height" | "activityLevel" | "weight";

export type TodaySummaryInput = {
  today: CalendarDate;
  /** null when the user has no profile row yet. */
  profile: TodayProfile | null;
  /** Latest logged weight on or before today; null when none. */
  weightKg: number | null;
  /** Food totals for today (the diary's day totals). */
  food: Nutrients;
  /** kcal snapshot of each exercise logged today. */
  exerciseKcal: readonly number[];
};

export type TodaySummary =
  | { status: "incomplete"; missing: MissingProfileField[] }
  | {
      status: "ready";
      /** BMR in whole kcal (a target below it deserves a warning). */
      bmrKcal: number;
      /** TDEE in whole kcal. */
      tdeeKcal: number;
      goal: Goal;
      goalKgPerWeek: number;
      /** Daily kcal the goal adds (gain) or removes (lose). */
      goalAdjustmentKcal: number;
      /** Safe minimum daily target for the user's sex. */
      minimumKcal: number;
      /** kcal added to reach minimumKcal; 0 when the goal-adjusted target is already at or above it. */
      floorRaiseKcal: number;
      /** tdeeKcal + goalAdjustmentKcal + floorRaiseKcal, in whole kcal; never below minimumKcal. */
      targetKcal: number;
      consumed: Nutrients;
      exerciseKcal: number;
      /** target + exercise - food, in whole kcal; negative when over target. */
      remainingKcal: number;
      /** Target split into grams per macro, whole grams. */
      macroTargets: Macros;
    };

const KCAL_PER_GRAM: Macros = { protein: 4, carbs: 4, fat: 9 };

function isPositive(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0;
}

function toSex(value: string | null): Sex | null {
  return SEXES.find((sex) => sex === value) ?? null;
}

function toActivityLevel(value: string | null): ActivityLevel | null {
  return ACTIVITY_LEVELS.find((level) => level === value) ?? null;
}

/** The stored goal and rate; anything unusable falls back to maintaining weight. */
function toGoal(profile: TodayProfile): { goal: Goal; kgPerWeek: number } {
  const goal = GOALS.find((candidate) => candidate === profile.goal);
  if (goal === undefined || goal === "maintain") return { goal: "maintain", kgPerWeek: 0 };
  const rate = profile.goalKgPerWeek;
  return Number.isFinite(rate) && rate > 0 ? { goal, kgPerWeek: rate } : { goal: "maintain", kgPerWeek: 0 };
}

/** Age on `today`, or null when the birth date is unusable (missing, invalid, or under the minimum age). */
function toAge(birthDate: string | null, today: CalendarDate): number | null {
  if (birthDate === null || !isCalendarDate(birthDate)) return null;
  const age = ageOnDate(birthDate, today);
  return age >= MIN_AGE_YEARS ? age : null;
}

/** Sum in integer hundredths (the column scale), so totals never drift. */
function sumKcal(values: readonly number[]): number {
  return values.reduce((total, value) => total + Math.round(value * 100), 0) / 100;
}

/** Math.round without negative zero. */
function wholeKcal(value: number): number {
  return Math.round(value) || 0;
}

type EnergyInputs = {
  bmr: BmrInput;
  activityLevel: ActivityLevel;
  goal: Goal;
  kgPerWeek: number;
  macroSplit: Macros;
};

function resolveEnergyInputs(
  profile: TodayProfile | null,
  weightKg: number | null,
  today: CalendarDate,
): EnergyInputs | MissingProfileField[] {
  const sex = toSex(profile?.sex ?? null);
  const ageYears = toAge(profile?.birthDate ?? null, today);
  const heightCm = profile?.heightCm ?? null;
  const activityLevel = toActivityLevel(profile?.activityLevel ?? null);

  const missing: MissingProfileField[] = [];
  if (sex === null) missing.push("sex");
  if (ageYears === null) missing.push("birthDate");
  if (!isPositive(heightCm)) missing.push("height");
  if (activityLevel === null) missing.push("activityLevel");
  if (!isPositive(weightKg)) missing.push("weight");

  if (
    profile === null ||
    sex === null ||
    ageYears === null ||
    !isPositive(heightCm) ||
    activityLevel === null ||
    !isPositive(weightKg)
  ) {
    return missing;
  }
  return {
    bmr: { sex, ageYears, heightCm, weightKg },
    activityLevel,
    ...toGoal(profile),
    macroSplit: profile.macroSplit,
  };
}

/**
 * Today's balance: target (TDEE from the profile and latest weight, adjusted
 * for the weight goal, never below the safe minimum for the user's sex) plus
 * exercise minus food. "incomplete" lists what the profile still needs
 * (a birth date under 18 counts as missing).
 */
export function buildTodaySummary({ today, profile, weightKg, food, exerciseKcal }: TodaySummaryInput): TodaySummary {
  const inputs = resolveEnergyInputs(profile, weightKg, today);
  if (Array.isArray(inputs)) return { status: "incomplete", missing: inputs };

  const bmr = calculateBmr(inputs.bmr);
  const tdeeKcal = Math.round(calculateTdee(bmr, inputs.activityLevel));
  const goalTargetKcal = Math.round(calorieTarget(bmr, inputs.activityLevel, inputs.goal, inputs.kgPerWeek));
  const targetKcal = applyCalorieFloor(goalTargetKcal, inputs.bmr.sex);
  const burned = sumKcal(exerciseKcal);
  const split = inputs.macroSplit;

  return {
    status: "ready",
    bmrKcal: Math.round(bmr),
    tdeeKcal,
    goal: inputs.goal,
    goalKgPerWeek: inputs.kgPerWeek,
    // Derived from the rounded values so the breakdown always adds up.
    goalAdjustmentKcal: wholeKcal(goalTargetKcal - tdeeKcal),
    minimumKcal: minimumDailyKcal(inputs.bmr.sex),
    floorRaiseKcal: targetKcal - goalTargetKcal,
    targetKcal,
    consumed: food,
    exerciseKcal: burned,
    remainingKcal: wholeKcal(remainingKcal(targetKcal, food.kcal, burned)),
    macroTargets: {
      protein: Math.round((targetKcal * split.protein) / 100 / KCAL_PER_GRAM.protein),
      carbs: Math.round((targetKcal * split.carbs) / 100 / KCAL_PER_GRAM.carbs),
      fat: Math.round((targetKcal * split.fat) / 100 / KCAL_PER_GRAM.fat),
    },
  };
}
