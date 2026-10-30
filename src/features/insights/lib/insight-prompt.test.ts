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
  weekPattern: {
    weekdayLoggedDays: 9,
    weekendLoggedDays: 3,
    weekdayAverageNetKcal: 1750,
    weekendAverageNetKcal: 2150,
    weekdayAverageBalanceKcal: -150,
    weekendAverageBalanceKcal: 250,
  },
  logging: { currentStreakDays: 4, longestStreakDays: 6 },
  weight: {
    entries: 4,
    startAverageKg: 72.4,
    endAverageKg: 71.6,
    changeKg: -0.8,
    expectedChangeKg: -1.2,
    expectedWindowDays: 20,
    expectedLoggedDays: 10,
  },
  macros: {
    averageProteinG: 95,
    averageCarbsG: 210,
    averageFatG: 62,
    targetProteinG: 130,
    targetCarbsG: 190,
    targetFatG: 60,
  },
  previous: {
    daysAgo: 7,
    improvements: ["Subí la proteína a 120 g."],
    loggedDays: 6,
    averageNetKcal: 1950,
    averageBalanceKcal: 50,
    balanceVsGoal: "a favor de la meta",
    averageProteinG: 80,
    averageCarbsG: 220,
    averageFatG: 65,
    endAverageKg: 72.4,
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

  it("explains the weekday and weekend split and asks to point out a weekend pattern", () => {
    expect(system).toContain("weekPattern");
    expect(system).toMatch(/fin de semana \(sábado y domingo\)/);
    expect(system).toMatch(/200 kcal/);
  });

  it("explains the logging streaks", () => {
    expect(system).toContain("currentStreakDays");
    expect(system).toContain("longestStreakDays");
  });

  it("compares the expected weight change with the real one, without medical claims", () => {
    expect(system).toContain("expectedChangeKg");
    expect(system).toContain("7700 kcal = 1 kg");
    expect(system).toMatch(/expectedLoggedDays.*parcial/);
    expect(system).toMatch(/menos de 0,5 kg son normales/);
    expect(system).toMatch(/nunca la atribuyas al metabolismo/);
  });

  it("asks to follow up on the previous summary's improvements with its numbers", () => {
    expect(system).toContain("previous");
    expect(system).toMatch(/improvements/);
    expect(system).toMatch(/pasaste de 80 g a 105 g/);
    expect(system).toMatch(/no repitas en improvements una que ya cumplió/);
  });

  // The data guide and the rules are shared with the questions (question-prompt.ts);
  // sharing them must not reorder the summary's own prompt.
  it("keeps the field list and the rules in their order", () => {
    const lines = system.split("\n");
    const at = (start: string) => lines.findIndex((line) => line.startsWith(start));

    expect(at("- previous:")).toBeLessThan(at("Un valor null"));
    expect(at("Un valor null")).toBeLessThan(at("Respondé solo un objeto JSON"));
    expect(lines.slice(at("Reglas:"))).toEqual([
      "Reglas:",
      expect.stringMatching(/^- No hagas ningún diagnóstico/),
      expect.stringMatching(/^- Nunca sugieras comer por debajo/),
      expect.stringMatching(/^- Si hay pocos días registrados/),
      expect.stringMatching(/^- Si no hay objetivo de calorías/),
    ]);
  });

  it("asks to suggest logging more when few days are logged", () => {
    expect(system).toMatch(/pocos días/i);
  });
});
