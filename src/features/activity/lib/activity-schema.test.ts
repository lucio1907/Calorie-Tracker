import { describe, expect, it } from "vitest";
import { activityStrings } from "../strings";
import {
  MAX_ACTIVITY_MINUTES,
  MAX_MANUAL_KCAL,
  parseCreateActivityForm,
  parseManualKcal,
  parseMinutes,
  parseUpdateActivityForm,
} from "./activity-schema";

const v = activityStrings.validation;

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseMinutes", () => {
  it("accepts whole minutes, trimmed", () => {
    expect(parseMinutes(" 45 ")).toEqual({ ok: true, value: 45 });
    expect(parseMinutes(String(MAX_ACTIVITY_MINUTES))).toEqual({ ok: true, value: 1440 });
  });

  it("requires a value", () => {
    expect(parseMinutes("")).toEqual({ ok: false, error: v.required });
    expect(parseMinutes(null)).toEqual({ ok: false, error: v.required });
  });

  it("rejects fractions and text", () => {
    expect(parseMinutes("30,5")).toEqual({ ok: false, error: v.wholeMinutes });
    expect(parseMinutes("half an hour")).toEqual({ ok: false, error: v.wholeMinutes });
  });

  it("rejects durations out of range", () => {
    expect(parseMinutes("0")).toEqual({ ok: false, error: v.minutesRange(1440) });
    expect(parseMinutes("1441")).toEqual({ ok: false, error: v.minutesRange(1440) });
  });
});

describe("parseManualKcal", () => {
  it("treats a blank field as no override", () => {
    expect(parseManualKcal("")).toEqual({ ok: true, value: null });
    expect(parseManualKcal("   ")).toEqual({ ok: true, value: null });
    expect(parseManualKcal(null)).toEqual({ ok: true, value: null });
  });

  it("accepts whole kcal, trimmed, up to the limit", () => {
    expect(parseManualKcal(" 450 ")).toEqual({ ok: true, value: 450 });
    expect(parseManualKcal(String(MAX_MANUAL_KCAL))).toEqual({ ok: true, value: 99_999 });
  });

  it("reads a thousands separator as thousands, not as a decimal point", () => {
    expect(parseManualKcal("1.000")).toEqual({ ok: true, value: 1000 });
    expect(parseManualKcal("1,200")).toEqual({ ok: true, value: 1200 });
    expect(parseManualKcal(" 12.345 ")).toEqual({ ok: true, value: 12_345 });
  });

  it("rejects fractions and text", () => {
    expect(parseManualKcal("1.5")).toEqual({ ok: false, error: v.wholeKcal });
    expect(parseManualKcal("450,5")).toEqual({ ok: false, error: v.wholeKcal });
    expect(parseManualKcal("mucho")).toEqual({ ok: false, error: v.wholeKcal });
  });

  it("rejects values out of range", () => {
    expect(parseManualKcal("0")).toEqual({ ok: false, error: v.kcalRange(99_999) });
    expect(parseManualKcal("-5")).toEqual({ ok: false, error: v.kcalRange(99_999) });
    expect(parseManualKcal("100000")).toEqual({ ok: false, error: v.kcalRange(99_999) });
  });
});

describe("parseCreateActivityForm", () => {
  const valid = { date: "2026-10-14", activityId: "8", minutes: "30" };

  it("parses the hidden ids and the duration, ignoring unknown fields", () => {
    expect(parseCreateActivityForm(form({ ...valid, kcal: "9999", user_id: "user-b" }))).toEqual({
      ok: true,
      value: { date: "2026-10-14", activityId: 8, minutes: 30, manualKcal: null },
    });
  });

  it("parses the calories typed by the user", () => {
    expect(parseCreateActivityForm(form({ ...valid, manualKcal: "450" }))).toEqual({
      ok: true,
      value: { date: "2026-10-14", activityId: 8, minutes: 30, manualKcal: 450 },
    });
  });

  it("reports both visible fields at once and echoes what was typed", () => {
    expect(parseCreateActivityForm(form({ ...valid, minutes: "abc", manualKcal: "0" }))).toEqual({
      ok: false,
      fieldErrors: { minutes: v.wholeMinutes, manualKcal: v.kcalRange(99_999) },
      formError: v.fix,
      values: { minutes: "abc", manualKcal: "0" },
    });
  });

  it("returns a field error and echoes the typed value", () => {
    expect(parseCreateActivityForm(form({ ...valid, minutes: "abc" }))).toEqual({
      ok: false,
      fieldErrors: { minutes: v.wholeMinutes },
      formError: v.fix,
      values: { minutes: "abc" },
    });
  });

  it("treats a bad hidden date or activity id as tampering", () => {
    for (const fields of [
      { ...valid, date: "2026-02-30" },
      { ...valid, date: "1999-12-31" },
      { ...valid, activityId: "-1" },
      { ...valid, activityId: "x" },
    ]) {
      expect(parseCreateActivityForm(form(fields))).toMatchObject({
        ok: false,
        fieldErrors: {},
        formError: activityStrings.errors.unexpected,
      });
    }
  });
});

describe("parseUpdateActivityForm", () => {
  it("parses the entry id and the new duration", () => {
    expect(parseUpdateActivityForm(form({ entryId: "42", minutes: "90" }))).toEqual({
      ok: true,
      value: { entryId: 42, minutes: 90, manualKcal: null },
    });
  });

  it("parses the calories typed by the user", () => {
    expect(parseUpdateActivityForm(form({ entryId: "42", minutes: "90", manualKcal: "700" }))).toEqual({
      ok: true,
      value: { entryId: 42, minutes: 90, manualKcal: 700 },
    });
  });

  it("validates the calories", () => {
    expect(parseUpdateActivityForm(form({ entryId: "42", minutes: "90", manualKcal: "x" }))).toMatchObject({
      ok: false,
      fieldErrors: { manualKcal: v.wholeKcal },
    });
  });

  it("treats a missing entry id as tampering", () => {
    expect(parseUpdateActivityForm(form({ minutes: "90" }))).toMatchObject({
      ok: false,
      formError: activityStrings.errors.unexpected,
    });
  });

  it("validates the duration", () => {
    expect(parseUpdateActivityForm(form({ entryId: "42", minutes: "" }))).toMatchObject({
      ok: false,
      fieldErrors: { minutes: v.required },
    });
  });
});
