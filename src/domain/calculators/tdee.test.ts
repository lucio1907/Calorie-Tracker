import { describe, expect, it } from "vitest";
import { ActivityLevel } from "../activity-level";
import { Goal } from "../goal";
import { InvalidArgumentError } from "./assert";
import { calculateTdee, calorieTarget, dailyAdjustment } from "./tdee";

describe("calculateTdee", () => {
  it.each([
    ["sedentary", ActivityLevel.Sedentary, 1200],
    ["light", ActivityLevel.Light, 1375],
    ["moderate", ActivityLevel.Moderate, 1550],
    ["active", ActivityLevel.Active, 1725],
    ["very active", ActivityLevel.VeryActive, 1900],
  ])("applies the %s multiplier", (_label, level, expected) => {
    expect(calculateTdee(1000, level)).toBeCloseTo(expected, 4);
  });

  it("rejects zero BMR", () => {
    expect(() => calculateTdee(0, ActivityLevel.Moderate)).toThrow(InvalidArgumentError);
  });

  it("rejects negative BMR", () => {
    expect(() => calculateTdee(-1500, ActivityLevel.Moderate)).toThrow(InvalidArgumentError);
  });
});

describe("dailyAdjustment", () => {
  it("is -550 kcal/day when losing 0.5 kg/week", () => {
    // 0.5 * 7700 / 7 = 550.
    expect(dailyAdjustment(Goal.Lose, 0.5)).toBeCloseTo(-550, 4);
  });

  it("is +275 kcal/day when gaining 0.25 kg/week", () => {
    // 0.25 * 7700 / 7 = 275.
    expect(dailyAdjustment(Goal.Gain, 0.25)).toBeCloseTo(275, 4);
  });

  it("ignores the rate when maintaining", () => {
    expect(dailyAdjustment(Goal.Maintain, 0.5)).toBeCloseTo(0, 4);
  });

  it("rejects a negative weekly rate", () => {
    expect(() => dailyAdjustment(Goal.Lose, -0.5)).toThrow(InvalidArgumentError);
  });
});

describe("calorieTarget", () => {
  it("combines TDEE and the goal adjustment", () => {
    // 1648.75 * 1.55 = 2555.5625; minus 550 = 2005.5625.
    expect(calorieTarget(1648.75, ActivityLevel.Moderate, Goal.Lose, 0.5)).toBeCloseTo(2005.5625, 4);
  });

  it("defaults to no adjustment", () => {
    expect(calorieTarget(1000, ActivityLevel.Sedentary, Goal.Maintain)).toBeCloseTo(1200, 4);
  });
});
