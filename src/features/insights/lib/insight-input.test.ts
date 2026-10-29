import { describe, expect, it } from "vitest";
import { buildTodaySummary, type TodayProfile } from "@/features/today/lib/today-summary";
import { buildCalorieHistory } from "@/features/progress/lib/calorie-history";
import type { ProfileVersion } from "@/features/progress/lib/profile-history";
import type { WeightEntry } from "@/features/progress/lib/types";
import { buildWeightTrend } from "@/features/progress/lib/weight-trend";
import { buildInsightInput, describeBalance } from "./insight-input";

const profile: TodayProfile = {
  sex: "female",
  birthDate: "1990-05-10",
  heightCm: 165,
  activityLevel: "moderate",
  goal: "lose",
  goalKgPerWeek: 0.5,
  proteinGPerKg: 1.8,
  carbFatSplit: { carbs: 60, fat: 40 },
};
const profiles: ProfileVersion[] = [{ effectiveDate: "2026-01-01", profile }];

const FROM = "2026-10-13";
const TO = "2026-10-19";

function readyOn(date: string, weightKg: number, dayProfile: TodayProfile = profile) {
  const summary = buildTodaySummary({
    today: date,
    profile: dayProfile,
    weightKg,
    food: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    exerciseKcal: [],
  });
  if (summary.status !== "ready") throw new Error("fixture profile must be complete");
  return summary;
}

function input({
  weights = [
    { id: 1, date: "2026-10-10", kg: 70.4 },
    { id: 2, date: "2026-10-13", kg: 70 },
    { id: 3, date: "2026-10-19", kg: 69.13 },
  ],
  versions = profiles,
}: { weights?: WeightEntry[]; versions?: ProfileVersion[] } = {}) {
  const target = readyOn(FROM, 70).targetKcal;
  const totals = [
    { date: "2026-10-13", foodKcal: target - 300, exerciseKcal: 0 },
    { date: "2026-10-14", foodKcal: target + 300, exerciseKcal: 150 },
    { date: "2026-10-15", foodKcal: target + 10, exerciseKcal: 0 },
  ];
  return buildInsightInput({
    rangeDays: 7,
    to: TO,
    history: buildCalorieHistory({ from: FROM, to: TO, totals, profiles: versions, weights }),
    trend: buildWeightTrend(weights, FROM, TO),
    profiles: versions,
    weights,
    macros: [
      { date: "2026-10-13", protein: 100, carbs: 180, fat: 50 },
      { date: "2026-10-14", protein: 121, carbs: 221.4, fat: 70.6 },
      { date: "2026-10-15", protein: 90, carbs: 200, fat: 60 },
    ],
  });
}

describe("buildInsightInput", () => {
  it("summarises the calorie history over logged days", () => {
    const result = input();

    expect(result.rangeDays).toBe(7);
    expect(result.loggedDays).toBe(3);
    expect(result.calories.underTargetDays).toBe(1);
    expect(result.calories.overTargetDays).toBe(1);
    expect(result.calories.onTargetDays).toBe(1);
    // Exercise averaged over the logged days: (0 + 150 + 0) / 3.
    expect(result.calories.averageExerciseKcal).toBe(50);
    expect(result.calories.averageTargetKcal).not.toBeNull();
    // Net per day: target - 300, target + 150, target + 10.
    expect(result.calories.averageNetKcal).toBe(Math.round(result.calories.averageTargetKcal! - 140 / 3));
  });

  it.each([
    ["lose", 250, "por encima del objetivo", "en contra de la meta"],
    ["lose", -250, "por debajo del objetivo", "a favor de la meta"],
    ["gain", 250, "por encima del objetivo", "a favor de la meta"],
    ["gain", -250, "por debajo del objetivo", "en contra de la meta"],
    ["maintain", 250, "por encima del objetivo", "en contra de la meta"],
    ["maintain", 30, "en el objetivo", "a favor de la meta"],
    ["lose", 50, "en el objetivo", "a favor de la meta"],
  ] as const)("spells out a %s goal with a %i kcal balance as %s, %s", (goal, balance, vsTarget, vsGoal) => {
    expect(describeBalance(goal, balance)).toEqual({ balanceVsTarget: vsTarget, balanceVsGoal: vsGoal });
  });

  it("has no balance meaning without a balance or a goal", () => {
    expect(describeBalance("lose", null)).toEqual({ balanceVsTarget: null, balanceVsGoal: null });
    expect(describeBalance(null, 250)).toEqual({ balanceVsTarget: "por encima del objetivo", balanceVsGoal: null });
  });

  it("includes the balance meaning in the input", () => {
    const { calories } = input();
    expect(calories).toMatchObject(describeBalance("lose", calories.averageBalanceKcal));
  });

  it("reports the 7-day average weight at the start and end of the range", () => {
    const { weight } = input();

    // 10-13: mean of 70.4 and 70 (70.2); 10-19: mean of 70 and 69.13 (69.57).
    expect(weight).toEqual({ entries: 2, startAverageKg: 70.2, endAverageKg: 69.6, changeKg: -0.6 });
  });

  it("has no weight block without weights in the range", () => {
    expect(input({ weights: [{ id: 1, date: "2026-10-01", kg: 70 }] }).weight).toBeNull();
  });

  it("compares average macros with the day's macro targets", () => {
    const { macros } = input();
    const targets = readyOn(FROM, 70).macroTargets;

    expect(macros).toEqual({
      averageProteinG: 104,
      averageCarbsG: 200,
      averageFatG: 60,
      targetProteinG: targets.protein,
      targetCarbsG: targets.carbs,
      targetFatG: targets.fat,
    });
  });

  it("gives the goal direction and the calorie floor from the profile on the last day", () => {
    const result = input();

    expect(result.goal).toBe("lose");
    expect(result.calorieFloorKcal).toBe(readyOn(TO, 69.13).minimumKcal);
  });

  it("leaves targets and the floor out when the profile cannot produce a target", () => {
    const incomplete: ProfileVersion[] = [{ effectiveDate: "2026-01-01", profile: { ...profile, heightCm: null, goal: "gain" } }];
    const result = input({ versions: incomplete });

    expect(result.goal).toBe("gain");
    expect(result.calorieFloorKcal).toBeNull();
    expect(result.calories.averageTargetKcal).toBeNull();
    expect(result.macros?.targetProteinG).toBeNull();
    expect(result.macros?.averageProteinG).toBe(104);
  });

  it("never carries personal data: no name, email, birth date, sex or food names", () => {
    const text = JSON.stringify(input());

    expect(text).not.toContain("1990");
    expect(text).not.toMatch(/birth|email|name|female|sex|height/i);
  });
});
