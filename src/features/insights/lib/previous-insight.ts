import { addDays, type CalendarDate } from "@/domain";
import { daysBetween } from "@/features/progress/lib/progress-range";
import type { InsightInput } from "./insight-input";
import type { Insight } from "./insight-schema";

/**
 * Days a previous summary of the same range may have been generated on: at
 * least half the range ago (a newer one would mostly cover the same days) and
 * at most twice the range ago (an older one no longer says how the person is
 * doing now).
 */
export function previousWindow(rangeDays: number, today: CalendarDate): { from: CalendarDate; to: CalendarDate } {
  return { from: addDays(today, -2 * rangeDays), to: addDays(today, -Math.ceil(rangeDays / 2)) };
}

/** What the model sees of the previous summary: its improvements and the numbers of the period it covered. */
export function previousBlock(insight: Insight, input: InsightInput, today: CalendarDate): NonNullable<InsightInput["previous"]> {
  return {
    daysAgo: daysBetween(insight.generatedOn, today),
    improvements: insight.improvements,
    loggedDays: input.loggedDays,
    averageNetKcal: input.calories.averageNetKcal,
    averageBalanceKcal: input.calories.averageBalanceKcal,
    balanceVsGoal: input.calories.balanceVsGoal,
    averageProteinG: input.macros?.averageProteinG ?? null,
    averageCarbsG: input.macros?.averageCarbsG ?? null,
    averageFatG: input.macros?.averageFatG ?? null,
    endAverageKg: input.weight?.endAverageKg ?? null,
  };
}
