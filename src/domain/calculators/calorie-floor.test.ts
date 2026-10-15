import { describe, expect, it } from "vitest";
import { Sex } from "../sex";
import { applyCalorieFloor, minimumDailyKcal } from "./calorie-floor";

describe("minimumDailyKcal", () => {
  it("is 1200 kcal for women", () => {
    expect(minimumDailyKcal(Sex.Female)).toBe(1200);
  });

  it("is 1500 kcal for men", () => {
    expect(minimumDailyKcal(Sex.Male)).toBe(1500);
  });
});

describe("applyCalorieFloor", () => {
  it.each([
    ["a woman", Sex.Female, 1100, 1200],
    ["a man", Sex.Male, 1400, 1500],
    ["a negative target", Sex.Male, -300, 1500],
  ])("raises a target below the minimum for %s", (_label, sex, target, expected) => {
    expect(applyCalorieFloor(target, sex)).toBe(expected);
  });

  it.each([
    ["exactly on the minimum", Sex.Female, 1200],
    ["above the minimum", Sex.Male, 2209.5],
    ["a man's target that is fine for a woman", Sex.Female, 1400],
  ])("keeps a target %s", (_label, sex, target) => {
    expect(applyCalorieFloor(target, sex)).toBe(target);
  });
});
