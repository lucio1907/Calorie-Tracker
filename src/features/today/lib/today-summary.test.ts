import { describe, expect, it } from "vitest";
import { ZERO_NUTRIENTS } from "@/domain";
import { buildTodaySummary, type TodayProfile, type TodaySummaryInput } from "./today-summary";

const TODAY = "2026-10-15";

/** 30-year-old man, 180 cm, 80 kg, moderate: BMR 1780, TDEE 1780 x 1.55 = 2759. */
const profile: TodayProfile = {
  sex: "male",
  birthDate: "1996-01-10",
  heightCm: 180,
  activityLevel: "moderate",
  goal: "maintain",
  goalKgPerWeek: 0,
  proteinGPerKg: 1.8,
  carbFatSplit: { carbs: 60, fat: 40 },
};

function input(overrides: Partial<TodaySummaryInput> = {}): TodaySummaryInput {
  return {
    today: TODAY,
    profile,
    weightKg: 80,
    food: ZERO_NUTRIENTS,
    exerciseKcal: [],
    ...overrides,
  };
}

describe("buildTodaySummary", () => {
  it("uses TDEE from the profile and latest weight as the target when maintaining", () => {
    const summary = buildTodaySummary(input());

    expect(summary).toMatchObject({
      status: "ready",
      tdeeKcal: 2759,
      goal: "maintain",
      goalAdjustmentKcal: 0,
      targetKcal: 2759,
      exerciseKcal: 0,
      remainingKcal: 2759,
    });
  });

  it("ignores a stored rate while maintaining", () => {
    const summary = buildTodaySummary(input({ profile: { ...profile, goalKgPerWeek: 0.5 } }));

    expect(summary).toMatchObject({ status: "ready", goalAdjustmentKcal: 0, targetKcal: 2759 });
  });

  it("subtracts the daily deficit of a weight-loss goal from TDEE", () => {
    // 0.5 kg/week x 7700 kcal/kg / 7 days = 550 kcal/day.
    const summary = buildTodaySummary(input({ profile: { ...profile, goal: "lose", goalKgPerWeek: 0.5 } }));

    expect(summary).toMatchObject({
      status: "ready",
      tdeeKcal: 2759,
      goal: "lose",
      goalKgPerWeek: 0.5,
      goalAdjustmentKcal: -550,
      targetKcal: 2209,
      remainingKcal: 2209,
    });
  });

  it("adds the daily surplus of a weight-gain goal to TDEE", () => {
    // 0.25 kg/week x 7700 / 7 = 275 kcal/day.
    const summary = buildTodaySummary(input({ profile: { ...profile, goal: "gain", goalKgPerWeek: 0.25 } }));

    expect(summary).toMatchObject({ status: "ready", goalAdjustmentKcal: 275, targetKcal: 3034 });
  });

  it("keeps TDEE + adjustment equal to the target after rounding", () => {
    // 0.3 kg/week = 330 kcal/day; TDEE for 81.3 kg is 2779.15 -> target round(2449.15) = 2449.
    const summary = buildTodaySummary(input({ profile: { ...profile, goal: "lose", goalKgPerWeek: 0.3 }, weightKg: 81.3 }));

    expect(summary.status).toBe("ready");
    if (summary.status !== "ready") return;
    expect(summary.tdeeKcal + summary.goalAdjustmentKcal).toBe(summary.targetKcal);
    expect(summary).toMatchObject({ tdeeKcal: 2779, targetKcal: 2449, goalAdjustmentKcal: -330 });
  });

  it("raises a woman's target to the 1200 kcal safe minimum, keeping the breakdown additive", () => {
    // 45 kg, 150 cm, 80-year-old woman, sedentary: BMR 826.5, TDEE 991.8; losing 1.5 kg/week is -1650 kcal/day.
    const summary = buildTodaySummary(
      input({
        profile: { ...profile, sex: "female", birthDate: "1946-01-10", heightCm: 150, activityLevel: "sedentary", goal: "lose", goalKgPerWeek: 1.5 },
        weightKg: 45,
      }),
    );

    expect(summary).toMatchObject({
      status: "ready",
      bmrKcal: 827,
      tdeeKcal: 992,
      goalAdjustmentKcal: -1650,
      minimumKcal: 1200,
      floorRaiseKcal: 1858,
      targetKcal: 1200,
      remainingKcal: 1200,
    });
    if (summary.status !== "ready") return;
    expect(summary.tdeeKcal + summary.goalAdjustmentKcal + summary.floorRaiseKcal).toBe(summary.targetKcal);
  });

  it("raises a man's target to the 1500 kcal safe minimum", () => {
    // 2759 - 1650 = 1109, below 1500.
    const summary = buildTodaySummary(input({ profile: { ...profile, goal: "lose", goalKgPerWeek: 1.5 } }));

    expect(summary).toMatchObject({
      status: "ready",
      tdeeKcal: 2759,
      goalAdjustmentKcal: -1650,
      minimumKcal: 1500,
      floorRaiseKcal: 391,
      targetKcal: 1500,
    });
  });

  it("leaves a target above the safe minimum untouched", () => {
    const summary = buildTodaySummary(input({ profile: { ...profile, goal: "lose", goalKgPerWeek: 0.5 } }));

    expect(summary).toMatchObject({ status: "ready", minimumKcal: 1500, floorRaiseKcal: 0, targetKcal: 2209 });
  });

  it("splits the floored target into macros", () => {
    const summary = buildTodaySummary(input({ profile: { ...profile, goal: "lose", goalKgPerWeek: 1.5 } }));

    // 1500 kcal - 144 g protein (576 kcal) = 924 kcal: 60% / 4 = 138.6 g, 40% / 9 = 41.1 g.
    expect(summary).toMatchObject({ status: "ready", targetKcal: 1500, macroTargets: { protein: 144, carbs: 139, fat: 41 } });
  });

  it("reports BMR so a target below it can be flagged", () => {
    // Sedentary: TDEE 1780 x 1.2 = 2136; losing 0.5 kg/week gives 1586, below the 1780 BMR but above the floor.
    const summary = buildTodaySummary(
      input({ profile: { ...profile, activityLevel: "sedentary", goal: "lose", goalKgPerWeek: 0.5 } }),
    );

    expect(summary).toMatchObject({ status: "ready", bmrKcal: 1780, floorRaiseKcal: 0, targetKcal: 1586 });
  });

  it("treats an unknown stored goal as maintain", () => {
    const summary = buildTodaySummary(input({ profile: { ...profile, goal: "bulk", goalKgPerWeek: 1 } }));

    expect(summary).toMatchObject({ status: "ready", goal: "maintain", goalAdjustmentKcal: 0, targetKcal: 2759 });
  });

  it("computes remaining = TDEE + exercise - food, from the day's totals", () => {
    const summary = buildTodaySummary(
      input({
        food: { kcal: 1500.4, protein: 90.25, carbs: 150, fat: 50.5 },
        exerciseKcal: [120.1, 180.2],
      }),
    );

    expect(summary).toMatchObject({
      status: "ready",
      targetKcal: 2759,
      consumed: { kcal: 1500.4, protein: 90.25, carbs: 150, fat: 50.5 },
      // Summed in hundredths: 300.3, not 300.29999999999995.
      exerciseKcal: 300.3,
      // 2759 + 300.3 - 1500.4 = 1558.9, shown as whole kcal.
      remainingKcal: 1559,
    });
  });

  it("goes negative when the day is over target", () => {
    const summary = buildTodaySummary(input({ food: { ...ZERO_NUTRIENTS, kcal: 3000 } }));

    expect(summary).toMatchObject({ status: "ready", remainingKcal: -241 });
  });

  it("never reports negative zero", () => {
    const summary = buildTodaySummary(input({ food: { ...ZERO_NUTRIENTS, kcal: 2759.2 } }));

    expect(summary.status === "ready" && Object.is(summary.remainingKcal, -0)).toBe(false);
  });

  it("sets protein by body weight and splits the rest of the target (4 kcal/g protein and carbs, 9 kcal/g fat)", () => {
    const summary = buildTodaySummary(input());

    // 80 kg x 1.8 = 144 g = 576 kcal; 2759 - 576 = 2183 kcal: 60% / 4 = 327.5 g, 40% / 9 = 97 g.
    expect(summary).toMatchObject({
      status: "ready",
      macroTargets: { protein: 144, carbs: 327, fat: 97 },
      proteinGPerKg: 1.8,
      proteinCapped: false,
    });
  });

  it("keeps protein constant in a deficit and takes the cut from carbs and fat", () => {
    const summary = buildTodaySummary(input({ profile: { ...profile, goal: "lose", goalKgPerWeek: 0.5 } }));

    // 2209 kcal - 576 = 1633 kcal: 60% / 4 = 245 g, 40% / 9 = 72.6 g.
    expect(summary).toMatchObject({ status: "ready", targetKcal: 2209, macroTargets: { protein: 144, carbs: 245, fat: 73 } });
  });

  it("recalculates protein from the latest weight", () => {
    const summary = buildTodaySummary(input({ weightKg: 92.5 }));

    // 92.5 x 1.8 = 166.5 -> 167 g.
    expect(summary.status === "ready" && summary.macroTargets.protein).toBe(167);
  });

  it("uses the stored protein setting and carbs/fat split", () => {
    const summary = buildTodaySummary(
      input({ profile: { ...profile, proteinGPerKg: 2.2, carbFatSplit: { carbs: 50, fat: 50 } } }),
    );

    // 80 x 2.2 = 176 g = 704 kcal; 2055 kcal left: 50% / 4 = 256.9 g, 50% / 9 = 114.2 g.
    expect(summary).toMatchObject({ status: "ready", macroTargets: { protein: 176, carbs: 257, fat: 114 }, proteinGPerKg: 2.2 });
  });

  it("caps protein to the target when the protein setting exceeds it", () => {
    // 120 kg, 150 cm, 80-year-old woman, sedentary, losing 1.5 kg/week: floored to 1200 kcal.
    // 120 x 3 = 360 g = 1440 kcal > 1200: protein 1200 / 4 = 300 g, nothing left for carbs or fat.
    const summary = buildTodaySummary(
      input({
        profile: {
          ...profile,
          sex: "female",
          birthDate: "1946-01-10",
          heightCm: 150,
          activityLevel: "sedentary",
          goal: "lose",
          goalKgPerWeek: 1.5,
          proteinGPerKg: 3,
        },
        weightKg: 120,
      }),
    );

    expect(summary).toMatchObject({
      status: "ready",
      targetKcal: 1200,
      macroTargets: { protein: 300, carbs: 0, fat: 0 },
      proteinCapped: true,
    });
  });

  it("falls back to the default macro settings when the stored ones are unusable", () => {
    const summary = buildTodaySummary(
      input({ profile: { ...profile, proteinGPerKg: Number.NaN, carbFatSplit: { carbs: 0, fat: 0 } } }),
    );

    expect(summary).toMatchObject({ status: "ready", macroTargets: { protein: 144, carbs: 327, fat: 97 }, proteinGPerKg: 1.8 });
  });

  it("asks for every body field when there is no profile row", () => {
    expect(buildTodaySummary(input({ profile: null, weightKg: null }))).toEqual({
      status: "incomplete",
      missing: ["sex", "birthDate", "height", "activityLevel", "weight"],
    });
  });

  it("treats an invalid stored birth date as missing", () => {
    const summary = buildTodaySummary(input({ profile: { ...profile, birthDate: "2008-02-30" } }));

    expect(summary).toEqual({ status: "incomplete", missing: ["birthDate"] });
  });

  it("lists only the missing fields", () => {
    const summary = buildTodaySummary(
      input({ profile: { ...profile, heightCm: null, activityLevel: null }, weightKg: null }),
    );

    expect(summary).toEqual({ status: "incomplete", missing: ["height", "activityLevel", "weight"] });
  });

  it("reports a stored birth date under 18 years old as under age, not as missing", () => {
    // Turns 18 tomorrow.
    const summary = buildTodaySummary(input({ profile: { ...profile, birthDate: "2008-10-16" } }));

    expect(summary).toEqual({ status: "underage", minAgeYears: 18 });
  });

  it("reports under age before any other missing field", () => {
    const summary = buildTodaySummary(
      input({ profile: { ...profile, birthDate: "2015-03-01", heightCm: null }, weightKg: null }),
    );

    expect(summary).toEqual({ status: "underage", minAgeYears: 18 });
  });

  it("treats a birth date born today as under age", () => {
    const summary = buildTodaySummary(input({ profile: { ...profile, birthDate: TODAY } }));

    expect(summary).toEqual({ status: "underage", minAgeYears: 18 });
  });

  it("computes the target from the 18th birthday on", () => {
    const summary = buildTodaySummary(input({ profile: { ...profile, birthDate: "2008-10-15" } }));

    expect(summary.status).toBe("ready");
  });

  it("treats unknown or out-of-range values as missing instead of throwing", () => {
    const summary = buildTodaySummary(
      input({
        // A birth date after today is unusable, so it is missing rather than under age.
        profile: { ...profile, sex: "other", birthDate: "2026-10-16", activityLevel: "extreme", heightCm: 0 },
        weightKg: 0,
      }),
    );

    expect(summary).toEqual({
      status: "incomplete",
      missing: ["sex", "birthDate", "height", "activityLevel", "weight"],
    });
  });
});
