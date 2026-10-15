import { dayTotals, Meal, MEALS, mealTotals, type Nutrients } from "@/domain";
import type { DiaryEntry } from "./types";

export type MealSection = { meal: Meal; entries: DiaryEntry[]; totals: Nutrients };

export type DiaryDay = { meals: MealSection[]; totals: Nutrients; entryCount: number };

/** "extra" is an overflow slot: only shown when something was logged there. */
const ALWAYS_SHOWN: ReadonlySet<Meal> = new Set([Meal.Breakfast, Meal.Lunch, Meal.Snack, Meal.Dinner]);

/**
 * Groups a day's entries into meal sections (in day order, entries keep
 * their order) with per-meal and day totals summed from the stored snapshots.
 */
export function buildDiaryDay(entries: readonly DiaryEntry[]): DiaryDay {
  const totalsByMeal = mealTotals(entries);
  const meals = MEALS.map((meal) => ({
    meal,
    entries: entries.filter((entry) => entry.meal === meal),
    totals: totalsByMeal[meal],
  })).filter((section) => ALWAYS_SHOWN.has(section.meal) || section.entries.length > 0);

  return { meals, totals: dayTotals(entries), entryCount: entries.length };
}
