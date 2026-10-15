import type { ActivityEntry } from "./types";

export type ActivityDay = { entries: ActivityEntry[]; totalKcal: number; totalMinutes: number };

/** Sum in integer hundredths (the kcal column scale), so totals never drift. */
function sumHundredths(values: readonly number[]): number {
  return values.reduce((total, value) => total + Math.round(value * 100), 0) / 100;
}

/** A day's entries (in logged order) with the day's kcal and minutes totals from the stored snapshots. */
export function buildActivityDay(entries: readonly ActivityEntry[]): ActivityDay {
  return {
    entries: [...entries],
    totalKcal: sumHundredths(entries.map((entry) => entry.kcal)),
    totalMinutes: sumHundredths(entries.map((entry) => entry.minutes)),
  };
}
