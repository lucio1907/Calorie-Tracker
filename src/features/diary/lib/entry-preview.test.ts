import { describe, expect, it } from "vitest";
import { previewEntry } from "./entry-preview";

const bread = {
  kcal: 269,
  protein: 9.3,
  carbs: 57.4,
  fat: 0.2,
  portions: [{ id: 1, label: "1 roll", grams: 50 }],
};

describe("previewEntry", () => {
  it("computes kcal and macros for grams", () => {
    expect(previewEntry(bread, "g", "100")).toEqual({
      grams: 100,
      nutrients: { kcal: 269, protein: 9.3, carbs: 57.4, fat: 0.2 },
    });
  });

  it("computes kcal and macros for a number of portions", () => {
    // 2 rolls = 100 g; 1.5 rolls = 75 g.
    expect(previewEntry(bread, "1", "2")?.grams).toBe(100);
    expect(previewEntry(bread, "1", "1,5")).toEqual({
      grams: 75,
      nutrients: { kcal: 201.75, protein: 6.98, carbs: 43.05, fat: 0.15 },
    });
  });

  it.each([
    ["an empty amount", "g", ""],
    ["text", "g", "abc"],
    ["zero", "g", "0"],
    ["too many grams", "g", "5001"],
    ["an unknown portion", "9", "1"],
    ["an invalid unit", "", "1"],
  ])("returns null for %s", (_label, unit, amount) => {
    expect(previewEntry(bread, unit, amount)).toBeNull();
  });
});
