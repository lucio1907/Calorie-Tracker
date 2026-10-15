import { describe, expect, it } from "vitest";
import { InvalidArgumentError } from "./assert";
import { remainingKcal } from "./daily-balance";

describe("remainingKcal", () => {
  it("adds exercise back to the remaining budget", () => {
    // 2000 - 1500 + 300 = 800.
    expect(remainingKcal(2000, 1500, 300)).toBeCloseTo(800, 4);
  });

  it("goes negative when over target", () => {
    // 2000 - 2500 + 0 = -500.
    expect(remainingKcal(2000, 2500, 0)).toBeCloseTo(-500, 4);
  });

  it("leaves the full target on an empty day", () => {
    expect(remainingKcal(2005.56, 0, 0)).toBeCloseTo(2005.56, 4);
  });

  it.each([
    ["negative target", -1, 0, 0],
    ["negative consumed", 2000, -100, 0],
    ["negative burned", 2000, 0, -50],
    ["NaN consumed", 2000, Number.NaN, 0],
  ])("rejects %s", (_label, target, consumed, burned) => {
    expect(() => remainingKcal(target, consumed, burned)).toThrow(InvalidArgumentError);
  });
});
