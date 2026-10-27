import { describe, expect, it } from "vitest";
import { settingsStrings } from "../strings";
import { latestWeightText, parseWeightForm, todayWeightEntry, WEIGHT_LIMITS } from "./weight-entry";

const v = settingsStrings.validation;

function form(kg?: string): FormData {
  const data = new FormData();
  if (kg !== undefined) data.set("kg", kg);
  return data;
}

describe("parseWeightForm", () => {
  it("parses kilograms with a decimal comma, rounded to 2 decimals", () => {
    expect(parseWeightForm(form(" 80,456 "))).toEqual({ ok: true, value: 80.46 });
  });

  it.each([[undefined], [""], ["  "]])("requires a value (%j)", (kg) => {
    expect(parseWeightForm(form(kg))).toEqual({ ok: false, error: v.required });
  });

  it("rejects text that is not a number", () => {
    expect(parseWeightForm(form("eighty"))).toEqual({ ok: false, error: v.number });
  });

  it.each([["19.99"], ["400.01"], ["0"], ["-80"]])("rejects %s kg (outside the column check)", (kg) => {
    const { min, max } = WEIGHT_LIMITS;
    expect(parseWeightForm(form(kg))).toEqual({ ok: false, error: v.weightRange(min, max) });
  });

  it.each([["20"], ["400"]])("accepts the bound %s kg", (kg) => {
    expect(parseWeightForm(form(kg))).toEqual({ ok: true, value: Number(kg) });
  });
});

describe("todayWeightEntry", () => {
  it("dates the entry with the Buenos Aires calendar day", () => {
    expect(todayWeightEntry(80.5, new Date("2026-10-15T12:00:00Z"))).toEqual({ entry_date: "2026-10-15", kg: 80.5 });
  });

  it("keeps the local day late in the evening, when UTC is already tomorrow", () => {
    // 22:30 in Buenos Aires (UTC-3) on the 15th is 01:30 UTC on the 16th.
    expect(todayWeightEntry(80.5, new Date("2026-10-16T01:30:00Z"))).toEqual({ entry_date: "2026-10-15", kg: 80.5 });
  });

  it("moves to the next local day right after local midnight", () => {
    expect(todayWeightEntry(80.5, new Date("2026-10-16T03:00:00Z"))).toEqual({ entry_date: "2026-10-16", kg: 80.5 });
  });
});

describe("latestWeightText", () => {
  const w = settingsStrings.weight;

  it("says when nothing is logged", () => {
    expect(latestWeightText(null, "2026-10-15")).toBe(w.none);
  });

  it("calls today's entry today", () => {
    expect(latestWeightText({ kg: 80.25, date: "2026-10-15" }, "2026-10-15")).toBe(w.latest("80,25", w.today));
  });

  it("names the day of an older entry", () => {
    expect(latestWeightText({ kg: 79, date: "2026-10-12" }, "2026-10-15")).toBe(w.latest("79", "lunes, 12 de octubre"));
  });
});
