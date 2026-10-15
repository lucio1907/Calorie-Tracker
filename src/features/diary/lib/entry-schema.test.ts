import { describe, expect, it } from "vitest";
import { MAX_ENTRY_GRAMS } from "@/domain";
import { diaryStrings } from "../strings";
import { entryIdSchema, parseCreateEntryForm, parseUpdateEntryForm } from "./entry-schema";

const v = diaryStrings.validation;

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const validCreate = { date: "2026-10-14", meal: "lunch", foodId: "7", unit: "g", amount: "150" };

describe("parseCreateEntryForm", () => {
  it("parses an entry logged in grams", () => {
    expect(parseCreateEntryForm(form(validCreate))).toEqual({
      ok: true,
      value: { date: "2026-10-14", meal: "lunch", foodId: 7, unit: { kind: "grams" }, amount: 150 },
    });
  });

  it("parses an entry logged in portions, with a decimal comma", () => {
    const result = parseCreateEntryForm(form({ ...validCreate, unit: "12", amount: " 1,5 " }));
    expect(result).toMatchObject({ ok: true, value: { unit: { kind: "portion", portionId: 12 }, amount: 1.5 } });
  });

  it("requires an amount", () => {
    expect(parseCreateEntryForm(form({ ...validCreate, amount: "" }))).toMatchObject({
      ok: false,
      fieldErrors: { amount: v.required },
      formError: v.fix,
    });
  });

  it("rejects text that is not a number", () => {
    expect(parseCreateEntryForm(form({ ...validCreate, amount: "two" }))).toMatchObject({
      ok: false,
      fieldErrors: { amount: v.number },
    });
  });

  it.each([["0"], ["-5"], [String(MAX_ENTRY_GRAMS + 1)]])("rejects %s grams", (amount) => {
    expect(parseCreateEntryForm(form({ ...validCreate, amount }))).toMatchObject({
      ok: false,
      fieldErrors: { amount: v.gramsRange(MAX_ENTRY_GRAMS) },
    });
  });

  it.each([["0"], ["1001"]])("rejects a quantity of %s portions", (amount) => {
    expect(parseCreateEntryForm(form({ ...validCreate, unit: "12", amount }))).toMatchObject({
      ok: false,
      fieldErrors: { amount: v.quantityRange },
    });
  });

  it("rejects an unknown meal", () => {
    expect(parseCreateEntryForm(form({ ...validCreate, meal: "brunch" }))).toMatchObject({
      ok: false,
      fieldErrors: { meal: v.required },
    });
  });

  it.each([
    ["date", "2026-02-30"],
    ["foodId", "abc"],
    ["foodId", "0"],
    ["unit", "half"],
  ])("rejects a tampered %s as a form error", (field, value) => {
    const result = parseCreateEntryForm(form({ ...validCreate, [field]: value }));
    expect(result).toMatchObject({ ok: false, formError: diaryStrings.errors.unexpected });
  });

  it("echoes what the user typed so a failed submit keeps it", () => {
    const result = parseCreateEntryForm(form({ ...validCreate, amount: "9999" }));
    expect(result).toMatchObject({ ok: false, values: { meal: "lunch", unit: "g", amount: "9999" } });
  });
});

describe("parseUpdateEntryForm", () => {
  const validUpdate = { entryId: "42", meal: "dinner", unit: "3", amount: "2" };

  it("parses a new meal and amount", () => {
    expect(parseUpdateEntryForm(form(validUpdate))).toEqual({
      ok: true,
      value: { entryId: 42, meal: "dinner", change: { unit: { kind: "portion", portionId: 3 }, amount: 2 } },
    });
  });

  it("allows a meal-only change when the form has no amount fields", () => {
    expect(parseUpdateEntryForm(form({ entryId: "42", meal: "snack" }))).toEqual({
      ok: true,
      value: { entryId: 42, meal: "snack", change: null },
    });
  });

  it("validates the amount when the unit is present", () => {
    expect(parseUpdateEntryForm(form({ ...validUpdate, amount: "" }))).toMatchObject({
      ok: false,
      fieldErrors: { amount: v.required },
    });
  });

  it("rejects a tampered entry id", () => {
    expect(parseUpdateEntryForm(form({ ...validUpdate, entryId: "-1" }))).toMatchObject({
      ok: false,
      formError: diaryStrings.errors.unexpected,
    });
  });
});

describe("entryIdSchema", () => {
  it.each([[1], ["17"]])("accepts %j", (value) => {
    expect(entryIdSchema.safeParse(value).success).toBe(true);
  });

  it.each([[0], [-3], [1.5], ["x"], [null]])("rejects %j", (value) => {
    expect(entryIdSchema.safeParse(value).success).toBe(false);
  });
});
