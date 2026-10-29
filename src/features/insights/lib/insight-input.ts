import { GOALS, type CalendarDate, type Goal } from "@/domain";
import type { DailyMacros } from "@/features/progress/data/progress";
import { ON_TARGET_TOLERANCE_KCAL, type CalorieHistory } from "@/features/progress/lib/calorie-history";
import { profileOnDate, type ProfileVersion } from "@/features/progress/lib/profile-history";
import type { WeightEntry } from "@/features/progress/lib/types";
import { weightOnOrBefore, type WeightTrend } from "@/features/progress/lib/weight-trend";
import { buildTodaySummary } from "@/features/today/lib/today-summary";

/**
 * What the model sees: aggregated numbers only. Never a name, email, birth
 * date, sex, height or food name (free OpenRouter providers may log prompts).
 * Keys are English and self-describing so the prompt can refer to them.
 */
export type InsightInput = {
  rangeDays: number;
  /** Days of the range with food logged; every average below is over these days. */
  loggedDays: number;
  /** The weight goal on the last day of the range; null without a profile. */
  goal: Goal | null;
  /** The safe minimum daily target; null when the profile cannot produce a target. */
  calorieFloorKcal: number | null;
  calories: {
    /** Food minus exercise. */
    averageNetKcal: number | null;
    averageTargetKcal: number | null;
    /** Net minus target: negative under target, positive over. */
    averageBalanceKcal: number | null;
    /** The balance's sign in words, so the model never has to infer it. */
    balanceVsTarget: BalanceVsTarget | null;
    /** Whether that balance moves toward the weight goal. */
    balanceVsGoal: BalanceVsGoal | null;
    underTargetDays: number;
    overTargetDays: number;
    onTargetDays: number;
    averageExerciseKcal: number | null;
  };
  /** The 7-day average weight on the first and last weigh-in of the range; null without weigh-ins. */
  weight: { entries: number; startAverageKg: number; endAverageKg: number; changeKg: number } | null;
  /** Average grams eaten vs. the average daily targets; null without logged days. */
  macros: {
    averageProteinG: number;
    averageCarbsG: number;
    averageFatG: number;
    targetProteinG: number | null;
    targetCarbsG: number | null;
    targetFatG: number | null;
  } | null;
};

export type BalanceVsTarget = "por encima del objetivo" | "por debajo del objetivo" | "en el objetivo";
export type BalanceVsGoal = "a favor de la meta" | "en contra de la meta";

export type InsightInputSource = {
  rangeDays: number;
  /** Last day of the range. */
  to: CalendarDate;
  history: CalorieHistory;
  trend: WeightTrend;
  /** Profile versions covering the range, oldest first. */
  profiles: readonly ProfileVersion[];
  /** Weights oldest first, including the latest one before the range. */
  weights: readonly WeightEntry[];
  /** Per-day macro totals from daily_macro_totals. */
  macros: readonly DailyMacros[];
};

const NO_FOOD = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/** Math.round without negative zero. */
function whole(value: number): number {
  return Math.round(value) || 0;
}

/** One decimal, enough for kg. */
function tenths(value: number): number {
  return Math.round(value * 10) / 10 || 0;
}

function averageOf(values: readonly number[]): number | null {
  return values.length === 0 ? null : whole(values.reduce((total, value) => total + value, 0) / values.length);
}

/**
 * What an average balance means, in the words the prompt uses. Within the
 * same ±50 kcal tolerance as the calorie history it is on target, which suits
 * every goal (the target already includes the goal's deficit or surplus).
 * Otherwise eating over target works against losing and maintaining, and
 * under target works against gaining and maintaining.
 */
export function describeBalance(
  goal: Goal | null,
  balanceKcal: number | null,
): { balanceVsTarget: BalanceVsTarget | null; balanceVsGoal: BalanceVsGoal | null } {
  if (balanceKcal === null) return { balanceVsTarget: null, balanceVsGoal: null };
  const onTarget = Math.abs(balanceKcal) <= ON_TARGET_TOLERANCE_KCAL;
  const balanceVsTarget: BalanceVsTarget = onTarget
    ? "en el objetivo"
    : balanceKcal > 0
      ? "por encima del objetivo"
      : "por debajo del objetivo";
  if (goal === null) return { balanceVsTarget, balanceVsGoal: null };

  const helps = onTarget || (goal === "lose" && balanceKcal < 0) || (goal === "gain" && balanceKcal > 0);
  return { balanceVsTarget, balanceVsGoal: helps ? "a favor de la meta" : "en contra de la meta" };
}

/** The target summary for `date` (profile and weight as they were then), or null when no target is possible. */
function readyOn(source: InsightInputSource, date: CalendarDate) {
  const summary = buildTodaySummary({
    today: date,
    profile: profileOnDate(source.profiles, date),
    weightKg: weightOnOrBefore(source.weights, date)?.kg ?? null,
    food: NO_FOOD,
    exerciseKcal: [],
  });
  return summary.status === "ready" ? summary : null;
}

function weightBlock(trend: WeightTrend): InsightInput["weight"] {
  const first = trend.points[0];
  const last = trend.points[trend.points.length - 1];
  if (!first || !last) return null;
  return {
    entries: trend.points.length,
    startAverageKg: tenths(first.averageKg),
    endAverageKg: tenths(last.averageKg),
    changeKg: tenths(last.averageKg - first.averageKg),
  };
}

function macroBlock(source: InsightInputSource, loggedDates: readonly CalendarDate[]): InsightInput["macros"] {
  if (loggedDates.length === 0) return null;
  const byDate = new Map(source.macros.map((day) => [day.date, day]));
  const eaten = loggedDates.map((date) => byDate.get(date) ?? { date, protein: 0, carbs: 0, fat: 0 });
  const targets = loggedDates.flatMap((date) => readyOn(source, date)?.macroTargets ?? []);

  return {
    averageProteinG: averageOf(eaten.map((day) => day.protein)) ?? 0,
    averageCarbsG: averageOf(eaten.map((day) => day.carbs)) ?? 0,
    averageFatG: averageOf(eaten.map((day) => day.fat)) ?? 0,
    targetProteinG: averageOf(targets.map((target) => target.protein)),
    targetCarbsG: averageOf(targets.map((target) => target.carbs)),
    targetFatG: averageOf(targets.map((target) => target.fat)),
  };
}

/**
 * A compact, anonymous summary of the range for the model, built from the
 * same numbers the Progress screen shows (the calorie history and weight
 * trend), plus macros against each logged day's macro targets.
 */
export function buildInsightInput(source: InsightInputSource): InsightInput {
  const { history } = source;
  const logged = history.days.filter((day) => day.foodKcal > 0);
  const lastProfile = profileOnDate(source.profiles, source.to);
  const lastDay = readyOn(source, source.to);
  // The summary's goal falls back to maintain for an unusable rate, like the target does.
  const goal = lastDay?.goal ?? GOALS.find((candidate) => candidate === lastProfile?.goal) ?? null;

  return {
    rangeDays: source.rangeDays,
    loggedDays: history.loggedDays,
    goal,
    calorieFloorKcal: lastDay?.minimumKcal ?? null,
    calories: {
      averageNetKcal: history.averageNetKcal,
      averageTargetKcal: history.averageTargetKcal,
      averageBalanceKcal: history.averageBalanceKcal,
      ...describeBalance(goal, history.averageBalanceKcal),
      underTargetDays: history.underDays,
      overTargetDays: history.overDays,
      onTargetDays: history.days.filter((day) => day.status === "on").length,
      averageExerciseKcal: averageOf(logged.map((day) => day.exerciseKcal)),
    },
    weight: weightBlock(source.trend),
    macros: macroBlock(
      source,
      logged.map((day) => day.date),
    ),
  };
}
