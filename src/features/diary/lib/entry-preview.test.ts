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

  it("previews a unit being defined: quantity x the typed unit weight", () => {
    // 2 units of 25 g = 50 g of bread: 134.5 kcal.
    expect(previewEntry(bread, "unit", "2", "25")).toEqual({
      grams: 50,
      nutrients: { kcal: 134.5, protein: 4.65, carbs: 28.7, fat: 0.1 },
    });
  });

  it.each([
    ["no weight", ""],
    ["a zero weight", "0"],
    ["a weight above the portion limit", "10001"],
    ["text", "abc"],
  ])("returns null for a unit being defined with %s", (_label, unitGrams) => {
    expect(previewEntry(bread, "unit", "2", unitGrams)).toBeNull();
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
