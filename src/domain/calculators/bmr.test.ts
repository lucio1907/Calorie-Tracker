import { describe, expect, it } from "vitest";
import { Sex } from "../sex";
import { InvalidArgumentError } from "./assert";
import { calculateBmr } from "./bmr";

describe("calculateBmr", () => {
  it("uses the +5 constant for men", () => {
    // 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5.
    expect(calculateBmr({ weightKg: 70, heightCm: 175, ageYears: 30, sex: Sex.Male })).toBeCloseTo(1648.75, 4);
  });

  it("uses the -161 constant for women", () => {
    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161.
    expect(calculateBmr({ weightKg: 60, heightCm: 165, ageYears: 25, sex: Sex.Female })).toBeCloseTo(1345.25, 4);
  });

  it("differs by 166 kcal between men and women", () => {
    const input = { weightKg: 80.5, heightCm: 180, ageYears: 40 };
    const male = calculateBmr({ ...input, sex: Sex.Male });
    const female = calculateBmr({ ...input, sex: Sex.Female });

    expect(male - female).toBeCloseTo(166, 4);
  });

  it.each([
    ["zero weight", 0, 175, 30],
    ["negative weight", -70, 175, 30],
    ["NaN weight", Number.NaN, 175, 30],
    ["zero height", 70, 0, 30],
    ["negative height", 70, -1, 30],
    ["zero age", 70, 175, 0],
    ["negative age", 70, 175, -5],
    ["fractional age", 70, 175, 30.5],
  ])("rejects %s", (_label, weightKg, heightCm, ageYears) => {
    expect(() => calculateBmr({ weightKg, heightCm, ageYears, sex: Sex.Male })).toThrow(InvalidArgumentError);
  });
});
