import { describe, expect, it } from "vitest";
import { InvalidArgumentError } from "./assert";
import { exerciseKcal } from "./exercise";

describe("exerciseKcal", () => {
  it.each([
    // 8 * 70 * 30 / 60 = 280.
    ["running half hour", 8, 70, 30, 280],
    // 3.5 * 72.5 * 45 / 60 = 190.3125 -> 190.
    ["walking rounds down", 3.5, 72.5, 45, 190],
    // 6 * 65 * 47 / 60 = 305.5 -> 306.
    ["half rounds up", 6, 65, 47, 306],
    // 10 * 80 * 90 / 60 = 1200.
    ["long session", 10, 80, 90, 1200],
  ])("%s: MET x weight x hours", (_label, met, weightKg, minutes, expected) => {
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
