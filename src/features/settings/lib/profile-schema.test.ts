import { describe, expect, it } from "vitest";
import { settingsStrings } from "../strings";
import { carbFatSplitTotal, latestBirthDate, parseProfileForm, profileFormDefaults, PROFILE_LIMITS } from "./profile-schema";
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
  proteinGPerKg: "1,6",
  carbsSharePct: "55",
  fatSharePct: "45",
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
        proteinGPerKg: 1.6,
        carbFatSplit: { carbs: 55, fat: 45 },
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

  it("rejects a birth date on the database's lower bound", () => {
    expect(parseProfileForm(form({ ...valid, birthDate: "1900-01-01" }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { birthDate: v.birthDateRange },
    });
  });

  it.each([
    ["2008-10-16", "turning 18 tomorrow"],
    ["2026-10-15", "today"],
    ["2030-01-01", "in the future"],
  ])("rejects a birth date %s (%s) as under the minimum age", (birthDate) => {
    expect(parseProfileForm(form({ ...valid, birthDate }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { birthDate: v.minAge(PROFILE_LIMITS.minAgeYears) },
    });
  });

  it("accepts someone turning 18 today", () => {
    expect(parseProfileForm(form({ ...valid, birthDate: "2008-10-15" }), TODAY)).toMatchObject({ ok: true });
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

  it.each([["0.8"], ["3"], ["3.0"], ["2.2"], ["1,8"]])("accepts a protein setting of %s g/kg", (proteinGPerKg) => {
    expect(parseProfileForm(form({ ...valid, proteinGPerKg }), TODAY)).toMatchObject({ ok: true });
  });

  it("stores the protein setting with one decimal", () => {
    expect(parseProfileForm(form({ ...valid, proteinGPerKg: "2.20" }), TODAY)).toMatchObject({
      ok: true,
      value: { proteinGPerKg: 2.2 },
    });
  });

  it.each([["0.7"], ["3.1"], ["0"], ["-1.8"], ["1.85"], ["2.25"]])(
    "rejects a protein setting of %s g/kg (0.8-3.0 in steps of 0.1)",
    (proteinGPerKg) => {
      const { min, max } = PROFILE_LIMITS.proteinGPerKg;
      expect(parseProfileForm(form({ ...valid, proteinGPerKg }), TODAY)).toMatchObject({
        ok: false,
        fieldErrors: { proteinGPerKg: v.proteinRange(min, max) },
      });
    },
  );

  it("requires the protein setting", () => {
    expect(parseProfileForm(form({ ...valid, proteinGPerKg: "" }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { proteinGPerKg: v.required },
    });
    expect(parseProfileForm(form({ ...valid, proteinGPerKg: "lots" }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { proteinGPerKg: v.number },
    });
  });

  it("limits the protein setting to the database range", () => {
    expect(PROFILE_LIMITS.proteinGPerKg).toEqual({ min: 0.8, max: 3 });
  });

  it.each([["101"], ["-1"]])("rejects a carbs or fat percentage of %s", (carbsSharePct) => {
    expect(parseProfileForm(form({ ...valid, carbsSharePct }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { carbsSharePct: v.pctRange },
    });
  });

  it("requires whole-number percentages (the columns are integers)", () => {
    expect(parseProfileForm(form({ ...valid, carbsSharePct: "55.5", fatSharePct: "44.5" }), TODAY)).toMatchObject({
      ok: false,
      fieldErrors: { carbsSharePct: v.wholeNumber, fatSharePct: v.wholeNumber },
    });
  });

  it("accepts a split that gives everything to one macro", () => {
    expect(parseProfileForm(form({ ...valid, carbsSharePct: "0", fatSharePct: "100" }), TODAY)).toMatchObject({
      ok: true,
      value: { carbFatSplit: { carbs: 0, fat: 100 } },
    });
  });

  it("requires the carbs/fat split to add up to 100", () => {
    const result = parseProfileForm(form({ ...valid, carbsSharePct: "50", fatSharePct: "45" }), TODAY);
    expect(result).toEqual({ ok: false, fieldErrors: { carbFatSplit: v.splitTotal(95) }, formError: v.fix });
  });

  it("checks the total only once every percentage is valid", () => {
    const result = parseProfileForm(form({ ...valid, fatSharePct: "" }), TODAY);
    expect(result).toEqual({ ok: false, fieldErrors: { fatSharePct: v.required }, formError: v.fix });
  });

  it("ignores fields it does not know (e.g. a forged user_id)", () => {
    expect(parseProfileForm(form({ ...valid, user_id: "someone-else" }), TODAY)).toMatchObject({ ok: true });
  });
});

describe("latestBirthDate", () => {
  it("is the birth date of someone turning 18 on the given day", () => {
    expect(PROFILE_LIMITS.minAgeYears).toBe(18);
    expect(latestBirthDate(TODAY)).toBe("2008-10-15");
  });

  it("falls back to 28 February when today is 29 February", () => {
    expect(latestBirthDate("2028-02-29")).toBe("2010-02-28");
  });
});

describe("carbFatSplitTotal", () => {
  it("adds the two percentages as typed", () => {
    expect(carbFatSplitTotal({ carbsSharePct: "55", fatSharePct: "45" })).toBe(100);
  });

  it("counts blank fields as 0 and returns null for text that is not a number", () => {
    expect(carbFatSplitTotal({ carbsSharePct: "60", fatSharePct: " " })).toBe(60);
    expect(carbFatSplitTotal({ carbsSharePct: "x", fatSharePct: "10" })).toBeNull();
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
      proteinGPerKg: "1,8",
      carbsSharePct: "60",
      fatSharePct: "40",
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
        proteinGPerKg: 2.2,
        carbsSharePct: 57,
        fatSharePct: 43,
      }),
    ).toEqual({
      sex: "male",
      birthDate: "1996-01-10",
      heightCm: "180,5",
      activityLevel: "moderate",
      goal: "lose",
      goalKgPerWeek: "0,25",
      proteinGPerKg: "2,2",
      carbsSharePct: "57",
      fatSharePct: "43",
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
      proteinGPerKg: 1.8,
      carbsSharePct: 60,
      fatSharePct: 40,
    });
    expect(defaults).toMatchObject({ sex: "", activityLevel: "", goal: "maintain", goalKgPerWeek: "" });
  });
});
