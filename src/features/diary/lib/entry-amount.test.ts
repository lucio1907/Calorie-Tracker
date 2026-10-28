import { describe, expect, it } from "vitest";
import { MAX_ENTRY_GRAMS } from "@/domain";
import { diaryStrings } from "../strings";
import {
  amountChanged,
  findUnitPortion,
  GRAMS_UNIT,
  MAX_PORTION_QUANTITY,
  NEW_UNIT,
  parseUnit,
  resolveEntryAmount,
} from "./entry-amount";

const UNIT = diaryStrings.units.unitLabel;

const portions = [
  { id: 3, label: "1 slice", grams: 25 },
  { id: 4, label: "1 cup", grams: 33.33 },
  { id: 5, label: "1 crumb", grams: 0.01 },
];

describe("parseUnit", () => {
  it("reads the grams option", () => {
    expect(parseUnit(GRAMS_UNIT)).toEqual({ kind: "grams" });
  });

  it("reads a portion id", () => {
    expect(parseUnit("12")).toEqual({ kind: "portion", portionId: 12 });
  });

  it("reads the new-unit option (its weight comes from another field)", () => {
    expect(parseUnit(NEW_UNIT)).toEqual({ kind: "newUnit" });
  });

  it.each([[""], ["abc"], ["-1"], ["0"], ["1.5"], [null], [undefined], [12]])("rejects %j", (value) => {
    expect(parseUnit(value)).toBeNull();
  });
});

describe("resolveEntryAmount", () => {
  it("logs plain grams without a portion", () => {
    expect(resolveEntryAmount({ kind: "grams" }, 150, portions)).toEqual({
      ok: true,
      value: { grams: 150, quantity: null, portionLabel: null },
    });
  });

  it("multiplies the quantity by the portion weight", () => {
    expect(resolveEntryAmount({ kind: "portion", portionId: 3 }, 2, portions)).toEqual({
      ok: true,
      value: { grams: 50, quantity: 2, portionLabel: "1 slice" },
    });
  });

  it("rounds the grams to 2 decimals, half up, without floating point drift", () => {
    // 1.5 x 33.33 g = 49.995 g -> 50 g.
    const result = resolveEntryAmount({ kind: "portion", portionId: 4 }, 1.5, portions);
    expect(result).toEqual({ ok: true, value: { grams: 50, quantity: 1.5, portionLabel: "1 cup" } });
    // 3 x 0.1 is 0.30000000000000004 in floats.
    const tenth = resolveEntryAmount({ kind: "portion", portionId: 9 }, 3, [{ id: 9, label: "pinch", grams: 0.1 }]);
    expect(tenth).toEqual({ ok: true, value: { grams: 0.3, quantity: 3, portionLabel: "pinch" } });
  });

  it("fails when the portion no longer exists", () => {
    expect(resolveEntryAmount({ kind: "portion", portionId: 99 }, 1, portions)).toEqual({
      ok: false,
      error: "portion_missing",
    });
  });

  it("fails when the total is above the per-entry limit", () => {
    expect(resolveEntryAmount({ kind: "grams" }, MAX_ENTRY_GRAMS + 0.01, portions)).toEqual({
      ok: false,
      error: "too_large",
    });
    // 300 x 25 g = 7500 g.
    expect(resolveEntryAmount({ kind: "portion", portionId: 3 }, 300, portions)).toEqual({
      ok: false,
      error: "too_large",
    });
  });

  it("accepts exactly the per-entry limit", () => {
    expect(resolveEntryAmount({ kind: "portion", portionId: 3 }, 200, portions)).toMatchObject({
      ok: true,
      value: { grams: MAX_ENTRY_GRAMS },
    });
  });

  it("fails when the total rounds down to zero grams", () => {
    // 0.01 x 0.01 g = 0.0001 g -> 0.00 at database precision.
    expect(resolveEntryAmount({ kind: "portion", portionId: 5 }, 0.01, portions)).toEqual({
      ok: false,
      error: "too_small",
    });
  });

  it.each([
    ["zero", 0],
    ["negative", -1],
    ["NaN", Number.NaN],
    ["infinite", Number.POSITIVE_INFINITY],
  ])("rejects a %s amount", (_label, amount) => {
    expect(resolveEntryAmount({ kind: "grams" }, amount, portions)).toEqual({ ok: false, error: "invalid_amount" });
  });

  it("rejects more portions than the database allows", () => {
    expect(resolveEntryAmount({ kind: "portion", portionId: 5 }, MAX_PORTION_QUANTITY + 1, portions)).toEqual({
      ok: false,
      error: "invalid_amount",
    });
  });
});

describe("resolveEntryAmount with a unit being defined", () => {
  it("multiplies the quantity by the typed unit weight and labels it as the unit", () => {
    expect(resolveEntryAmount({ kind: "newUnit", grams: 25 }, 2, portions)).toEqual({
      ok: true,
      value: { grams: 50, quantity: 2, portionLabel: UNIT },
    });
  });

  it("applies the same per-entry limit as a portion", () => {
    expect(resolveEntryAmount({ kind: "newUnit", grams: 10000 }, 2, portions)).toEqual({ ok: false, error: "too_large" });
  });
});

describe("findUnitPortion", () => {
  it("finds the food's unit portion, ignoring case and spaces", () => {
    const unit = { id: 9, label: " Unidad ", grams: 25 };
    expect(findUnitPortion([...portions, unit])).toBe(unit);
  });

  it("is undefined when the food has no unit yet", () => {
    expect(findUnitPortion(portions)).toBeUndefined();
  });
});

describe("amountChanged", () => {
  const logged = { grams: 50, quantity: 2, portionLabel: "1 slice" };

  it("is false for the same grams, quantity and portion", () => {
    expect(amountChanged(logged, { ...logged })).toBe(false);
  });

  it.each([
    ["grams", { ...logged, grams: 75 }],
    ["quantity", { ...logged, quantity: 3 }],
    ["portion", { ...logged, portionLabel: "1 cup" }],
    ["switch to grams", { grams: 50, quantity: null, portionLabel: null }],
  ])("is true when the %s changes", (_label, next) => {
    expect(amountChanged(logged, next)).toBe(true);
  });
});
