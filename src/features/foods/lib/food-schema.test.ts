import { describe, expect, it } from "vitest";
import { foodsStrings } from "../strings";
import { barcodeSchema, normalizeBarcode, offQuerySchema, parseFoodForm, parsePortionForm } from "./food-schema";

const v = foodsStrings.validation;

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
}

const valid = {
  name: "  Granola casera ",
  brand: "",
  barcode: "",
  kcal: "450",
  protein: "12,5",
  carbs: "60",
  fat: "18.2",
  fiber: "",
  sodiumMg: "",
};

describe("parseFoodForm", () => {
  it("trims text, accepts decimal commas and turns empty optionals into null", () => {
    expect(parseFoodForm(form(valid))).toEqual({
      ok: true,
      value: {
        name: "Granola casera",
        brand: null,
        barcode: null,
        kcal: 450,
        protein: 12.5,
        carbs: 60,
        fat: 18.2,
        fiber: null,
        sodiumMg: null,
      },
    });
  });

  it("normalizes a barcode typed with spaces or dashes", () => {
    const result = parseFoodForm(form({ ...valid, barcode: "779 0580-660000" }));
    expect(result.ok && result.value.barcode).toBe("7790580660000");
  });

  it("reports required, number and range errors per field and echoes what was typed", () => {
    const result = parseFoodForm(form({ ...valid, name: " ", kcal: "", protein: "abc", fat: "120", sodiumMg: "-1" }));
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: {
        name: v.required,
        kcal: v.required,
        protein: v.number,
        fat: v.range(0, 100),
        sodiumMg: v.range(0, 100000),
      },
      formError: v.fix,
      values: { name: " ", protein: "abc" },
    });
  });

  it("rejects an invalid barcode", () => {
    const result = parseFoodForm(form({ ...valid, barcode: "12345" }));
    expect(!result.ok && result.fieldErrors.barcode).toBe(v.barcode);
  });

  it("rejects macros that add up to more than 100 g", () => {
    const result = parseFoodForm(form({ ...valid, protein: "50", carbs: "40", fat: "20" }));
    expect(result).toMatchObject({ ok: false, fieldErrors: {}, formError: v.macrosTotal });
  });

  it("rejects energy above 900 kcal per 100 g", () => {
    const result = parseFoodForm(form({ ...valid, kcal: "1420" }));
    expect(!result.ok && result.fieldErrors.kcal).toBe(v.range(0, 900));
  });
});

describe("parsePortionForm", () => {
  it("accepts a label and positive grams", () => {
    expect(parsePortionForm(form({ label: " 1 rebanada ", grams: "25,5" }))).toEqual({
      ok: true,
      value: { label: "1 rebanada", grams: 25.5 },
    });
  });

  it.each([
    [{ label: "", grams: "25" }, { label: v.required }],
    [{ label: "Taza", grams: "0" }, { grams: v.gramsRange }],
    [{ label: "Taza", grams: "20000" }, { grams: v.gramsRange }],
    [{ label: "Taza", grams: "" }, { grams: v.required }],
  ])("rejects %j", (fields, errors) => {
    expect(parsePortionForm(form(fields))).toEqual({ ok: false, fieldErrors: { label: undefined, grams: undefined, ...errors } });
  });
});

describe("barcodeSchema", () => {
  it.each(["7790580660000", "12345678", " 7790-580 660000 "])("accepts %j", (input) => {
    expect(barcodeSchema.safeParse(input).success).toBe(true);
  });

  it.each(["1234567", "123456789012345", "77905806600ab", ""])("rejects %j", (input) => {
    expect(barcodeSchema.safeParse(input).success).toBe(false);
  });

  it("normalizes separators", () => {
    expect(normalizeBarcode(" 779-0580 660000")).toBe("7790580660000");
  });
});

describe("offQuerySchema", () => {
  it("needs 3 to 100 characters after trimming", () => {
    expect(offQuerySchema.safeParse("  ab ").success).toBe(false);
    expect(offQuerySchema.safeParse(" yerba ").data).toBe("yerba");
    expect(offQuerySchema.safeParse("x".repeat(101)).success).toBe(false);
  });
});
