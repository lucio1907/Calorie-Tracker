import { describe, expect, it } from "vitest";
import { progressStrings } from "../strings";
import { parseKg, parseUpdateWeightEntryForm, parseWeightDate, parseWeightEntryForm } from "./weight-schema";

const v = progressStrings.validation;
const TODAY = "2026-10-19";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseKg", () => {
  it("accepts a decimal comma and keeps two decimals", () => {
    expect(parseKg("80,456")).toEqual({ ok: true, value: 80.46 });
    expect(parseKg(" 72.5 ")).toEqual({ ok: true, value: 72.5 });
  });

  it("rejects empty, non-numeric and out-of-range values", () => {
    expect(parseKg("")).toEqual({ ok: false, error: v.required });
    expect(parseKg(null)).toEqual({ ok: false, error: v.required });
    expect(parseKg("abc")).toEqual({ ok: false, error: v.number });
    expect(parseKg("19.99")).toEqual({ ok: false, error: v.weightRange(20, 400) });
    expect(parseKg("400.01")).toEqual({ ok: false, error: v.weightRange(20, 400) });
  });
});

describe("parseWeightDate", () => {
  it("accepts today and past days", () => {
    expect(parseWeightDate(TODAY, TODAY)).toEqual({ ok: true, value: TODAY });
    expect(parseWeightDate("2026-01-31", TODAY)).toEqual({ ok: true, value: "2026-01-31" });
  });

  it("rejects future, invalid and missing dates", () => {
    expect(parseWeightDate("2026-10-20", TODAY)).toEqual({ ok: false, error: v.futureDate });
    expect(parseWeightDate("2026-02-30", TODAY)).toEqual({ ok: false, error: v.date });
    expect(parseWeightDate("1999-12-31", TODAY)).toEqual({ ok: false, error: v.date });
    expect(parseWeightDate("", TODAY)).toEqual({ ok: false, error: v.date });
    expect(parseWeightDate(null, TODAY)).toEqual({ ok: false, error: v.date });
  });
});

describe("parseWeightEntryForm", () => {
  it("returns the date and kg", () => {
    expect(parseWeightEntryForm(form({ date: "2026-10-18", kg: "80.5" }), TODAY)).toEqual({
      ok: true,
      value: { date: "2026-10-18", kg: 80.5 },
    });
  });

  it("reports every invalid field and echoes what was typed", () => {
    expect(parseWeightEntryForm(form({ date: "2026-10-25", kg: "5" }), TODAY)).toEqual({
      ok: false,
      fieldErrors: { date: v.futureDate, kg: v.weightRange(20, 400) },
      formError: v.fix,
      values: { date: "2026-10-25", kg: "5" },
    });
  });
});

describe("parseUpdateWeightEntryForm", () => {
  it("adds the entry id", () => {
    expect(parseUpdateWeightEntryForm(form({ entryId: "12", date: "2026-10-18", kg: "80" }), TODAY)).toEqual({
      ok: true,
      value: { entryId: 12, date: "2026-10-18", kg: 80 },
    });
  });

  it("treats a bad entry id as tampering", () => {
    const result = parseUpdateWeightEntryForm(form({ entryId: "-1", date: "2026-10-18", kg: "80" }), TODAY);
    expect(result).toMatchObject({ ok: false, fieldErrors: {}, formError: progressStrings.errors.unexpected });
  });
});
