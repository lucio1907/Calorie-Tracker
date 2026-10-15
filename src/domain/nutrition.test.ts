import { describe, expect, it } from "vitest";
import { InvalidArgumentError } from "./calculators/assert";
import { MAX_ENTRY_GRAMS, mealTotals, nutrientSnapshot, sumNutrients, ZERO_NUTRIENTS } from "./nutrition";

const arroz = { kcal: 339, protein: 6.9, carbs: 77.5, fat: 0.2 };

describe("nutrientSnapshot", () => {
  it("scales per-100 g values to the logged grams", () => {
    // 150 g: 339 * 1.5 = 508.5, 6.9 * 1.5 = 10.35, 77.5 * 1.5 = 116.25, 0.2 * 1.5 = 0.3.
    expect(nutrientSnapshot(arroz, 150)).toEqual({ kcal: 508.5, protein: 10.35, carbs: 116.25, fat: 0.3 });
  });

  it("rounds to 2 decimals, half up, without floating point drift", () => {
    // 0.1 * 3 in floats is 0.30000000000000004; 33.33 g of 0.15 = 0.049995 -> 0.05.
    expect(nutrientSnapshot({ kcal: 10, protein: 0.1, carbs: 0.15, fat: 1.05 }, 300)).toEqual({
      kcal: 30,
      protein: 0.3,
      carbs: 0.45,
      fat: 3.15,
    });
    expect(nutrientSnapshot({ kcal: 0, protein: 0, carbs: 0.15, fat: 0 }, 33.33).carbs).toBe(0.05);
  });

  it("keeps fractional grams", () => {
    // 12.5 g of 900 kcal/100 g = 112.5 kcal.
    expect(nutrientSnapshot({ kcal: 900, protein: 0, carbs: 0, fat: 100 }, 12.5)).toEqual({
      kcal: 112.5,
      protein: 0,
      carbs: 0,
      fat: 12.5,
    });
  });

  it.each([
    ["zero grams", 0],
    ["negative grams", -5],
    ["NaN grams", Number.NaN],
    ["more than the per-entry limit", MAX_ENTRY_GRAMS + 1],
  ])("rejects %s", (_label, grams) => {
    expect(() => nutrientSnapshot(arroz, grams)).toThrow(InvalidArgumentError);
  });

  it("rejects negative nutrient values", () => {
    expect(() => nutrientSnapshot({ ...arroz, fat: -1 }, 100)).toThrow(InvalidArgumentError);
  });
});

describe("sumNutrients", () => {
  it("adds snapshots exactly (0.1 + 0.2 is 0.3)", () => {
    const total = sumNutrients([
      { kcal: 100.1, protein: 0.1, carbs: 1, fat: 0.7 },
      { kcal: 200.2, protein: 0.2, carbs: 2, fat: 0.2 },
    ]);
    expect(total).toEqual({ kcal: 300.3, protein: 0.3, carbs: 3, fat: 0.9 });
  });

  it("is zero for an empty list", () => {
    expect(sumNutrients([])).toEqual(ZERO_NUTRIENTS);
  });
});

describe("mealTotals", () => {
  it("totals every meal, including empty ones", () => {
    const totals = mealTotals([
      { meal: "breakfast", kcal: 120, protein: 4, carbs: 20, fat: 2 },
      { meal: "breakfast", kcal: 80.5, protein: 1.5, carbs: 10, fat: 3 },
      { meal: "dinner", kcal: 500, protein: 30, carbs: 50, fat: 15 },
    ]);

    expect(totals.breakfast).toEqual({ kcal: 200.5, protein: 5.5, carbs: 30, fat: 5 });
    expect(totals.dinner).toEqual({ kcal: 500, protein: 30, carbs: 50, fat: 15 });
    expect(totals.lunch).toEqual(ZERO_NUTRIENTS);
    expect(totals.snack).toEqual(ZERO_NUTRIENTS);
    expect(totals.extra).toEqual(ZERO_NUTRIENTS);
  });
});
