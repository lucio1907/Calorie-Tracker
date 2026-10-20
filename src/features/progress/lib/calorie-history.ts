import type { CalendarDate } from "@/domain";
import { buildTodaySummary } from "@/features/today/lib/today-summary";
import { profileOnDate, type ProfileVersion } from "./profile-history";
import { daysInRange } from "./progress-range";
import type { DailyEnergy, WeightEntry } from "./types";
import { weightOnOrBefore } from "./weight-trend";

export type BalanceStatus = "under" | "over" | "on" | "unlogged";

/** One day of the calorie history. */
export type CalorieDay = {
  date: CalendarDate;
  foodKcal: number;
  exerciseKcal: number;
  /** Food minus exercise, whole kcal. */
  netKcal: number;
  /** The day's target (the profile as it was that day, weight on or before it); null when it can't be computed. */
  targetKcal: number | null;
  /** Net minus target, whole kcal: negative under target, positive over; null without a target or food. */
  balanceKcal: number | null;
  status: BalanceStatus;
};

export type CalorieHistory = {
  /** Every day of the range, oldest first. */
  days: CalorieDay[];
  /** Days with food logged. */
  loggedDays: number;
  /** True when at least one day of the range has a target (the profile and a weight allow one). */
  hasTarget: boolean;
  /** Averages over logged days (balance and target only over days that have a target); null when none. */
  averageNetKcal: number | null;
  averageTargetKcal: number | null;
  averageBalanceKcal: number | null;
  underDays: number;
  overDays: number;
};

export type CalorieHistoryInput = {
  from: CalendarDate;
  to: CalendarDate;
  /** Per-day totals from daily_energy_totals (days without entries are absent). */
  totals: readonly DailyEnergy[];
  /** Profile history oldest first, covering the range (empty before a profile exists). */
  profiles: readonly ProfileVersion[];
  /** Weights oldest first, including the latest one before `from` when there is one. */
  weights: readonly WeightEntry[];
};

/** A balance within ±this many kcal counts as on target. */
export const ON_TARGET_TOLERANCE_KCAL = 50;

/** Math.round without negative zero. */
function whole(value: number): number {
  return Math.round(value) || 0;
}

function average(values: readonly number[]): number | null {
  return values.length === 0 ? null : whole(values.reduce((total, value) => total + value, 0) / values.length);
}

function statusOf(balance: number | null, logged: boolean): BalanceStatus {
  if (!logged || balance === null) return "unlogged";
  if (Math.abs(balance) <= ON_TARGET_TOLERANCE_KCAL) return "on";
  return balance < 0 ? "under" : "over";
}

/**
 * Daily calorie balance over a range, using Today's target logic for each day
 * (buildTodaySummary with that day as "today": age on that day, the weight
 * logged on or before it, exercise added back). The profile is the version
 * that applied that day, so changing the goal later does not rewrite history.
 * A day counts as logged once it has food; exercise alone is not a full day.
 */
export function buildCalorieHistory({ from, to, totals, profiles, weights }: CalorieHistoryInput): CalorieHistory {
  const byDate = new Map(totals.map((total) => [total.date, total]));

  const days = daysInRange(from, to).map((date): CalorieDay => {
    const total = byDate.get(date);
    const foodKcal = total?.foodKcal ?? 0;
    const exerciseKcal = total?.exerciseKcal ?? 0;
    const logged = foodKcal > 0;

    const summary = buildTodaySummary({
      today: date,
      profile: profileOnDate(profiles, date),
      weightKg: weightOnOrBefore(weights, date)?.kg ?? null,
      food: { kcal: foodKcal, protein: 0, carbs: 0, fat: 0 },
      exerciseKcal: [exerciseKcal],
    });
    const targetKcal = summary.status === "ready" ? summary.targetKcal : null;
    // remaining = target + exercise - food, so the balance (net - target) is its negation.
    const balanceKcal = summary.status === "ready" && logged ? whole(-summary.remainingKcal) : null;

    return {
      date,
      foodKcal,
      exerciseKcal,
      netKcal: whole(foodKcal - exerciseKcal),
      targetKcal,
      balanceKcal,
      status: statusOf(balanceKcal, logged),
    };
  });

  const logged = days.filter((day) => day.foodKcal > 0);
  const withTarget = logged.filter((day) => day.balanceKcal !== null);

  return {
    days,
    loggedDays: logged.length,
    hasTarget: days.some((day) => day.targetKcal !== null),
    averageNetKcal: average(logged.map((day) => day.netKcal)),
    averageTargetKcal: average(withTarget.map((day) => day.targetKcal ?? 0)),
    averageBalanceKcal: average(withTarget.map((day) => day.balanceKcal ?? 0)),
    underDays: days.filter((day) => day.status === "under").length,
    overDays: days.filter((day) => day.status === "over").length,
  };
}
