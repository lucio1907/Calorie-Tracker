import { GOALS, KCAL_PER_KG, type CalendarDate, type Goal } from "@/domain";
import type { DailyMacros } from "@/features/progress/data/progress";
import { ON_TARGET_TOLERANCE_KCAL, type CalorieDay, type CalorieHistory } from "@/features/progress/lib/calorie-history";
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
  /** Logged days split by weekday (Monday to Friday) and weekend; averages are null without logged days on that side. */
  weekPattern: {
    weekdayLoggedDays: number;
    weekendLoggedDays: number;
    weekdayAverageNetKcal: number | null;
    weekendAverageNetKcal: number | null;
    weekdayAverageBalanceKcal: number | null;
    weekendAverageBalanceKcal: number | null;
  };
  logging: {
    /** Consecutive logged days ending on the last day (or the day before, while the last day has no food yet). */
    currentStreakDays: number;
    longestStreakDays: number;
  };
  /**
   * The 7-day average weight on the first and last weigh-in of the range;
   * null without weigh-ins. expectedChangeKg is the summed balance of the
   * logged days from the first weigh-in to the day before the last one, in kg
   * (null without such a day); expectedWindowDays counts every day of that
   * span and expectedLoggedDays the ones that entered the sum.
   */
  weight: {
    entries: number;
    startAverageKg: number;
    endAverageKg: number;
    changeKg: number;
    expectedChangeKg: number | null;
    expectedWindowDays: number;
    expectedLoggedDays: number;
  } | null;
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

/** A day's food changes the weight seen on later days, so the span ends the day before the last weigh-in. */
function weightBlock(trend: WeightTrend, days: readonly CalorieDay[]): InsightInput["weight"] {
  const first = trend.points[0];
  const last = trend.points[trend.points.length - 1];
  if (!first || !last) return null;
  const window = days.filter((day) => day.date >= first.date && day.date < last.date);
  const balances = window.flatMap((day) => (day.foodKcal > 0 && day.balanceKcal !== null ? [day.balanceKcal] : []));
  return {
    entries: trend.points.length,
    startAverageKg: tenths(first.averageKg),
    endAverageKg: tenths(last.averageKg),
    changeKg: tenths(last.averageKg - first.averageKg),
    expectedChangeKg: balances.length === 0 ? null : tenths(balances.reduce((total, kcal) => total + kcal, 0) / KCAL_PER_KG),
    expectedWindowDays: window.length,
    expectedLoggedDays: balances.length,
  };
}

/** Saturday or Sunday; calendar dates are read in UTC, like addDays. */
function isWeekend(date: CalendarDate): boolean {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6;
}

function weekPatternBlock(logged: readonly CalorieDay[]): InsightInput["weekPattern"] {
  const weekend = logged.filter((day) => isWeekend(day.date));
  const weekdays = logged.filter((day) => !isWeekend(day.date));
  const balances = (side: readonly CalorieDay[]) => side.flatMap((day) => (day.balanceKcal === null ? [] : [day.balanceKcal]));
  return {
    weekdayLoggedDays: weekdays.length,
    weekendLoggedDays: weekend.length,
    weekdayAverageNetKcal: averageOf(weekdays.map((day) => day.netKcal)),
    weekendAverageNetKcal: averageOf(weekend.map((day) => day.netKcal)),
    weekdayAverageBalanceKcal: averageOf(balances(weekdays)),
    weekendAverageBalanceKcal: averageOf(balances(weekend)),
  };
}

/** Streaks over the range's days (oldest first); a day counts once it has food, as in the calorie history. */
function loggingBlock(days: readonly CalorieDay[]): InsightInput["logging"] {
  let longestStreakDays = 0;
  let run = 0;
  for (const day of days) {
    run = day.foodKcal > 0 ? run + 1 : 0;
    longestStreakDays = Math.max(longestStreakDays, run);
  }
  const lastDay = days[days.length - 1];
  const upToStreak = lastDay && lastDay.foodKcal === 0 ? days.slice(0, -1) : days;
  const lastUnlogged = upToStreak.findLastIndex((day) => day.foodKcal === 0);
  return { currentStreakDays: upToStreak.length - 1 - lastUnlogged, longestStreakDays };
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
    weekPattern: weekPatternBlock(logged),
    logging: loggingBlock(history.days),
    weight: weightBlock(source.trend, history.days),
    macros: macroBlock(
      source,
      logged.map((day) => day.date),
    ),
  };
}
