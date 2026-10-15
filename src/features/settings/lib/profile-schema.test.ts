import { describe, expect, it } from "vitest";
import { settingsStrings } from "../strings";
import { macroSplitTotal, parseProfileForm, profileFormDefaults, PROFILE_LIMITS } from "./profile-schema";
import type { ProfileFormValues } from "./types";

const v = settingsStrings.validation;
const TODAY = "2026-10-15";

const valid: ProfileFormValues = {
  sex: "female",
  birthDate: "1990-05-20",
  heightCm: "165,5",
  activityLevel: "light",
  goal: "lose",
  goalKgPerWeek: "0,5",
  proteinPct: "30",
  carbsPct: "45",
  fatPct: "25",
};

function form(fields: Partial<ProfileFormValues> & Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) data.set(key, value);
  return data;
}

describe("parseProfileForm", () => {
  it("parses every field, accepting a decimal comma", () => {
    expect(parseProfileForm(form(valid), TODAY)).toEqual({
      ok: true,
      value: {
        sex: "female",
        birthDate: "1990-05-20",
        heightCm: 165.5,
        activityLevel: "light",
        goal: "lose",
        goalKgPerWeek: 0.5,
        macroSplit: { protein: 30, carbs: 45, fat: 25 },
      },
    });
  });

  it("stores a rate of 0 while maintaining, whatever the form sent", () => {
    const result = parseProfileForm(form({ ...valid, goal: "maintain", goalKgPerWeek: "9" }), TODAY);
    expect(result).toMatchObject({ ok: true, value: { goal: "maintain", goalKgPerWeek: 0 } });
  });

  it("does not need a rate field while maintaining", () => {
    const data = form({ ...valid, goal: "maintain" });
    data.delete("goalKgPerWeek");
    const result = parseProfileForm(data, TODAY);
    expect(result).toMatchObject({ ok: true, value: { goalKgPerWeek: 0 } });
  });

  it("rounds height to 1 decimal and the rate to 2 (the column scales)", () => {
    const result = parseProfileForm(form({ ...valid, heightCm: "170.26", goalKgPerWeek: "0.333" }), TODAY);
    expect(result).toMatchObject({ ok: true, value: { heightCm: 170.3, goalKgPerWeek: 0.33 } });
  });

  it("requires every body field", () => {
    const result = parseProfileForm(form({ ...valid, sex: "", birthDate: "", heightCm: "", activityLevel: "" }), TODAY);
    expect(result).toEqual({
      ok: false,
      fieldErrors: { sex: v.required, birthDate: v.required, heightCm: v.required, activityLevel: v.required },
      formError: v.fix,
    });
  });

  it.each([["other"], ["MALE"]])("rejects the unknown sex %s", (sex) => {
    expect(parseProfileForm(form({ ...valid, sex }), TODAY)).toMatchObject({ ok: false, fieldErrors: { sex: v.required } });
  });

  it("rejects an unknown activity level or goal", () => {
    expect(parseProfileForm(form({ ...valid, activityLevel: "extreme", goal: "bulk" }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { activityLevel: v.required, goal: v.required },
    });
  });

  it.each([["2026-02-30"], ["20/05/1990"], ["abc"]])("rejects the malformed birth date %s", (birthDate) => {
    expect(parseProfileForm(form({ ...valid, birthDate }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { birthDate: v.date },
    });
  });

  it.each([
    ["1900-01-01", "on the database's lower bound"],
    ["2026-10-15", "today"],
    ["2025-10-16", "less than a year ago"],
    ["2030-01-01", "in the future"],
  ])("rejects a birth date %s (%s)", (birthDate) => {
    expect(parseProfileForm(form({ ...valid, birthDate }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { birthDate: v.birthDateRange },
    });
  });

  it("accepts a birth date exactly one year ago", () => {
    expect(parseProfileForm(form({ ...valid, birthDate: "2025-10-15" }), TODAY)).toMatchObject({ ok: true });
  });

  it.each([["49.9"], ["250.1"], ["0"], ["-170"]])("rejects a height of %s cm", (heightCm) => {
    const { min, max } = PROFILE_LIMITS.heightCm;
    expect(parseProfileForm(form({ ...valid, heightCm }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { heightCm: v.heightRange(min, max) },
    });
  });

  it("rejects a height that is not a number", () => {
    expect(parseProfileForm(form({ ...valid, heightCm: "tall" }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { heightCm: v.number },
    });
  });

  it.each([["0"], ["0.04"], ["1.51"], ["-0.5"]])("rejects a rate of %s kg/week when losing", (goalKgPerWeek) => {
    const { min, max } = PROFILE_LIMITS.goalKgPerWeek;
    expect(parseProfileForm(form({ ...valid, goalKgPerWeek }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { goalKgPerWeek: v.rateRange(min, max) },
    });
  });

  it("requires a rate when gaining", () => {
    expect(parseProfileForm(form({ ...valid, goal: "gain", goalKgPerWeek: "" }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { goalKgPerWeek: v.required },
    });
  });

  it.each([["101"], ["-1"]])("rejects a macro percentage of %s", (proteinPct) => {
    expect(parseProfileForm(form({ ...valid, proteinPct }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { proteinPct: v.pctRange },
    });
  });

  it("requires whole-number percentages (the columns are integers)", () => {
    expect(parseProfileForm(form({ ...valid, proteinPct: "30.5", carbsPct: "44.5" }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { proteinPct: v.wholeNumber, carbsPct: v.wholeNumber },
    });
  });

  it("requires the macro split to add up to 100", () => {
    const result = parseProfileForm(form({ ...valid, proteinPct: "30", carbsPct: "40", fatPct: "25" }), TODAY);
    expect(result).toEqual({ ok: false, fieldErrors: { macroSplit: v.macroTotal(95) }, formError: v.fix });
  });

  it("checks the total only once every percentage is valid", () => {
    const result = parseProfileForm(form({ ...valid, fatPct: "" }), TODAY);
    expect(result).toEqual({ ok: false, fieldErrors: { fatPct: v.required }, formError: v.fix });
  });

  it("ignores fields it does not know (e.g. a forged user_id)", () => {
    expect(parseProfileForm(form({ ...valid, user_id: "someone-else" }), TODAY)).toMatchObject({ ok: true });
  });
});

describe("macroSplitTotal", () => {
  it("adds the three percentages as typed", () => {
    expect(macroSplitTotal({ proteinPct: "30", carbsPct: "45", fatPct: "25" })).toBe(100);
  });

  it("counts blank fields as 0 and returns null for text that is not a number", () => {
    expect(macroSplitTotal({ proteinPct: "30", carbsPct: "", fatPct: " " })).toBe(30);
    expect(macroSplitTotal({ proteinPct: "30", carbsPct: "x", fatPct: "10" })).toBeNull();
  });
});

describe("profileFormDefaults", () => {
  it("uses the database defaults before a profile exists", () => {
    expect(profileFormDefaults(null)).toEqual({
      sex: "",
      birthDate: "",
      heightCm: "",
      activityLevel: "",
      goal: "maintain",
      goalKgPerWeek: "",
      proteinPct: "30",
      carbsPct: "40",
      fatPct: "30",
    });
  });

  it("fills the form from the stored profile", () => {
    expect(
      profileFormDefaults({
        sex: "male",
        birthDate: "1996-01-10",
        heightCm: 180.5,
        activityLevel: "moderate",
        goal: "lose",
        goalKgPerWeek: 0.25,
        proteinPct: 35,
        carbsPct: 35,
        fatPct: 30,
      }),
    ).toEqual({
      sex: "male",
      birthDate: "1996-01-10",
      heightCm: "180.5",
      activityLevel: "moderate",
      goal: "lose",
      goalKgPerWeek: "0.25",
      proteinPct: "35",
      carbsPct: "35",
      fatPct: "30",
    });
  });

  it("leaves the rate blank while maintaining and blanks unknown stored values", () => {
    const defaults = profileFormDefaults({
      sex: "other",
      birthDate: null,
      heightCm: null,
      activityLevel: "extreme",
      goal: "maintain",
      goalKgPerWeek: 0,
      proteinPct: 30,
      carbsPct: 40,
      fatPct: 30,
    });
    expect(defaults).toMatchObject({ sex: "", activityLevel: "", goal: "maintain", goalKgPerWeek: "" });
  });
});
