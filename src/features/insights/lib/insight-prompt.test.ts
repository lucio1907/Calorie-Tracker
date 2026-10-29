import { describe, expect, it } from "vitest";
import type { InsightInput } from "./insight-input";
import { buildInsightMessages } from "./insight-prompt";

const input: InsightInput = {
  rangeDays: 30,
  loggedDays: 12,
  goal: "lose",
  calorieFloorKcal: 1200,
  calories: {
    averageNetKcal: 1850,
    averageTargetKcal: 1900,
    averageBalanceKcal: -50,
    balanceVsTarget: "en el objetivo",
    balanceVsGoal: "a favor de la meta",
    underTargetDays: 5,
    overTargetDays: 4,
    onTargetDays: 3,
    averageExerciseKcal: 120,
  },
  weight: { entries: 4, startAverageKg: 72.4, endAverageKg: 71.6, changeKg: -0.8 },
  macros: {
    averageProteinG: 95,
    averageCarbsG: 210,
    averageFatG: 62,
    targetProteinG: 130,
    targetCarbsG: 190,
    targetFatG: 60,
  },
};

describe("buildInsightMessages", () => {
  const { system, user } = buildInsightMessages(input);

  it("sends the input as the user message, as JSON", () => {
    expect(JSON.parse(user)).toEqual(input);
  });

  it("asks for the JSON object the schema validates", () => {
    expect(system).toContain('{"overview": string, "wins": string[], "improvements": string[]}');
    expect(system).toMatch(/solo un objeto JSON/i);
    expect(system).toContain("sin texto fuera del JSON");
  });

  it("frames a supportive coach in Spanish with voseo", () => {
    expect(system).toMatch(/cómo venís en general/);
    expect(system).toMatch(/hasta 3/i);
  });

  it("forbids diagnoses, extreme diets and eating below the calorie floor", () => {
    expect(system).toMatch(/diagnóstico/i);
    expect(system).toMatch(/calorieFloorKcal/);
    expect(system).toMatch(/dietas extremas/i);
  });

  it("spells out what the balance sign means for each goal", () => {
    expect(system).toContain("balanceVsTarget");
    expect(system).toContain("balanceVsGoal");
    expect(system).toMatch(/positivo.*por encima del objetivo/i);
    expect(system).toMatch(/lose.*por debajo/i);
    expect(system).toMatch(/gain.*por encima/i);
    expect(system).toMatch(/maintain/i);
  });

  it("asks to suggest logging more when few days are logged", () => {
    expect(system).toMatch(/pocos días/i);
  });
});
