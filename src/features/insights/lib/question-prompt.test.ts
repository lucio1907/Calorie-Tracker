import { describe, expect, it } from "vitest";
import type { InsightInput } from "./insight-input";
import { buildInsightMessages } from "./insight-prompt";
import { QUESTION_KEYS } from "./insight-questions";
import { buildQuestionMessages } from "./question-prompt";

const input = {
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
  weight: null,
  macros: null,
  previous: null,
} satisfies InsightInput;

describe("buildQuestionMessages", () => {
  it("sends the same anonymous input as the summary, as JSON", () => {
    const { user } = buildQuestionMessages(input, "weight");
    expect(user).toBe(buildInsightMessages(input).user);
  });

  it("explains the data and keeps the summary's safety rules", () => {
    const { system } = buildQuestionMessages(input, "protein");

    expect(system).toContain("weekPattern");
    expect(system).toContain("expectedChangeKg");
    expect(system).toMatch(/diagnóstico/i);
    expect(system).toMatch(/calorieFloorKcal/);
    expect(system).toMatch(/dietas extremas/i);
  });

  it("asks for the answer JSON object instead of the summary one", () => {
    const { system } = buildQuestionMessages(input, "weekend");

    expect(system).toContain('{"answer": string, "tips": string[]}');
    expect(system).not.toContain('"overview"');
  });

  it.each([
    ["weight", /peso/i],
    ["protein", /proteína/i],
    ["weekend", /fin(es)? de semana/i],
    ["consistency", /constancia|registrar/i],
  ] as const)("asks the %s question", (question, pattern) => {
    const { system } = buildQuestionMessages(input, question);
    expect(system.split("Pregunta:")[1]).toMatch(pattern);
  });

  it("asks a different question for each key", () => {
    const questions = QUESTION_KEYS.map((key) => buildQuestionMessages(input, key).system.split("Pregunta:")[1]);
    expect(new Set(questions).size).toBe(QUESTION_KEYS.length);
  });
});
