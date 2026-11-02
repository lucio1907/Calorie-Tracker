import type { BalanceVsGoal, InsightInput } from "./insight-input";

export type MacroKey = "protein" | "carbs" | "fat";

/** The numbers shown next to a summary: the goal status and each macro against its target. */
export type InsightStats = {
  balanceVsGoal: BalanceVsGoal | null;
  averageBalanceKcal: number | null;
  /** Protein, carbs and fat, in that order; empty without macros. */
  macros: Array<{ key: MacroKey; averageG: number; targetG: number | null }>;
};

/** The stats of a range from the same input the model reads; null when the range has no logged day. */
export function insightStats(input: InsightInput): InsightStats | null {
  if (input.loggedDays === 0) return null;
  const { macros } = input;
  return {
    balanceVsGoal: input.calories.balanceVsGoal,
    averageBalanceKcal: input.calories.averageBalanceKcal,
    macros: macros
      ? [
          { key: "protein", averageG: macros.averageProteinG, targetG: macros.targetProteinG },
          { key: "carbs", averageG: macros.averageCarbsG, targetG: macros.targetCarbsG },
          { key: "fat", averageG: macros.averageFatG, targetG: macros.targetFatG },
        ]
      : [],
  };
}
