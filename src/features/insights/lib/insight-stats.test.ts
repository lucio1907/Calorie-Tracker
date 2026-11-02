import { describe, expect, it } from "vitest";
import type { InsightInput } from "./insight-input";
import { insightStats } from "./insight-stats";

const input = {
  rangeDays: 7,
  loggedDays: 5,
  goal: "lose",
  calorieFloorKcal: 1200,
  calories: {
    averageNetKcal: 1750,
    averageTargetKcal: 1900,
    averageBalanceKcal: -150,
    balanceVsTarget: "por debajo del objetivo",
    balanceVsGoal: "a favor de la meta",
    underTargetDays: 4,
    overTargetDays: 1,
    onTargetDays: 0,
    averageExerciseKcal: 0,
  },
  weekPattern: {
    weekdayLoggedDays: 5,
    weekendLoggedDays: 0,
    weekdayAverageNetKcal: 1750,
    weekendAverageNetKcal: null,
    weekdayAverageBalanceKcal: -150,
    weekendAverageBalanceKcal: null,
  },
  logging: { currentStreakDays: 5, longestStreakDays: 5 },
  weight: null,
  macros: { averageProteinG: 95, averageCarbsG: 210, averageFatG: 62, targetProteinG: 130, targetCarbsG: 190, targetFatG: null },
  previous: null,
} satisfies InsightInput;

describe("insightStats", () => {
  it("keeps the goal status, the average balance and each macro against its target", () => {
    expect(insightStats(input)).toEqual({
      balanceVsGoal: "a favor de la meta",
      averageBalanceKcal: -150,
      macros: [
        { key: "protein", averageG: 95, targetG: 130 },
        { key: "carbs", averageG: 210, targetG: 190 },
        { key: "fat", averageG: 62, targetG: null },
      ],
    });
  });

  it("has no macros when the range has none", () => {
    expect(insightStats({ ...input, macros: null })?.macros).toEqual([]);
  });

  it("is null when the range has no logged day", () => {
    expect(insightStats({ ...input, loggedDays: 0 })).toBeNull();
  });
});
