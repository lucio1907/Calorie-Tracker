import { describe, expect, it } from "vitest";
import type { InsightInput } from "./insight-input";
import type { Insight } from "./insight-schema";
import { previousBlock, previousWindow } from "./previous-insight";

const TODAY = "2026-10-19";

const insight: Insight = {
  overview: "Venís bien.",
  wins: ["Registraste 5 días."],
  improvements: ["Subí la proteína a 120 g.", "Registrá los fines de semana."],
  model: "nvidia/nemotron-3.5-lightning:free",
  generatedOn: "2026-10-12",
  rangeDays: 7,
};

const input = {
  rangeDays: 7,
  loggedDays: 5,
  goal: "lose",
  calorieFloorKcal: 1200,
  calories: {
    averageNetKcal: 1900,
    averageTargetKcal: 1800,
    averageBalanceKcal: 100,
    balanceVsTarget: "por encima del objetivo",
    balanceVsGoal: "en contra de la meta",
    underTargetDays: 1,
    overTargetDays: 3,
    onTargetDays: 1,
    averageExerciseKcal: 0,
  },
  weekPattern: {
    weekdayLoggedDays: 5,
    weekendLoggedDays: 0,
    weekdayAverageNetKcal: 1900,
    weekendAverageNetKcal: null,
    weekdayAverageBalanceKcal: 100,
    weekendAverageBalanceKcal: null,
  },
  logging: { currentStreakDays: 5, longestStreakDays: 5 },
  weight: {
    entries: 2,
    startAverageKg: 72,
    endAverageKg: 71.8,
    changeKg: -0.2,
    expectedChangeKg: 0.1,
    expectedWindowDays: 6,
    expectedLoggedDays: 5,
  },
  macros: { averageProteinG: 80, averageCarbsG: 230, averageFatG: 70, targetProteinG: 120, targetCarbsG: 200, targetFatG: 60 },
  previous: null,
} satisfies InsightInput;

describe("previousWindow", () => {
  it.each([
    [7, "2026-10-05", "2026-10-15"],
    [30, "2026-08-20", "2026-10-04"],
    [90, "2026-04-22", "2026-09-04"],
  ])("looks %i-day summaries up from 2x the range to half the range before today", (range, from, to) => {
    expect(previousWindow(range, TODAY)).toEqual({ from, to });
  });
});

describe("previousBlock", () => {
  it("gives the previous summary's improvements, its age and the numbers of its own period", () => {
    expect(previousBlock(insight, input, TODAY)).toEqual({
      daysAgo: 7,
      improvements: insight.improvements,
      loggedDays: 5,
      averageNetKcal: 1900,
      averageBalanceKcal: 100,
      balanceVsGoal: "en contra de la meta",
      averageProteinG: 80,
      averageCarbsG: 230,
      averageFatG: 70,
      endAverageKg: 71.8,
    });
  });

  it("has no macros or weight when that period had none", () => {
    expect(previousBlock(insight, { ...input, macros: null, weight: null }, TODAY)).toMatchObject({
      averageProteinG: null,
      averageCarbsG: null,
      averageFatG: null,
      endAverageKg: null,
    });
  });
});
