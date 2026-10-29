import { describe, expect, it } from "vitest";
import { InvalidArgumentError } from "./assert";
import { exerciseKcal } from "./exercise";

describe("exerciseKcal", () => {
  it.each([
    // (8 - 1) * 70 * 30 / 60 = 245.
    ["running half hour", 8, 70, 30, 245],
    // (3.5 - 1) * 72.5 * 45 / 60 = 135.9375 -> 136.
    ["walking rounds", 3.5, 72.5, 45, 136],
    // (6 - 1) * 65 * 47 / 60 = 254.58 -> 255.
    ["rounds to nearest", 6, 65, 47, 255],
    // (2 - 1) * 61 * 30 / 60 = 30.5 -> 31.
    ["half rounds up", 2, 61, 30, 31],
    // (10 - 1) * 80 * 90 / 60 = 1080.
    ["long session", 10, 80, 90, 1080],
    // (2.3 - 1) * 70 * 30 / 60 = 45.5 -> 46, with no binary rounding drift.
    ["decimal MET half", 2.3, 70, 30, 46],
    // At rest (MET 1) nothing is burned beyond the BMR the target already counts.
    ["resting MET", 1, 70, 60, 0],
    ["below resting MET", 0.9, 70, 60, 0],
  ])("%s: (MET - 1) x weight x hours", (_label, met, weightKg, minutes, expected) => {
    expect(exerciseKcal(met, weightKg, minutes)).toBe(expected);
  });

  it.each([
    ["zero MET", 0, 70, 30],
    ["negative MET", -3, 70, 30],
    ["zero weight", 8, 0, 30],
    ["zero minutes", 8, 70, 0],
    ["negative minutes", 8, 70, -10],
    ["infinite minutes", 8, 70, Number.POSITIVE_INFINITY],
  ])("rejects %s", (_label, met, weightKg, minutes) => {
    expect(() => exerciseKcal(met, weightKg, minutes)).toThrow(InvalidArgumentError);
  });
});
