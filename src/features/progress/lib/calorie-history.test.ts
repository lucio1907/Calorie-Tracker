import { describe, expect, it } from "vitest";
import { buildTodaySummary, type TodayProfile } from "@/features/today/lib/today-summary";
import { buildCalorieHistory, ON_TARGET_TOLERANCE_KCAL } from "./calorie-history";
import type { ProfileVersion } from "./profile-history";
import type { WeightEntry } from "./types";

const profile: TodayProfile = {
  sex: "male",
  birthDate: "1990-05-10",
  heightCm: 180,
  activityLevel: "moderate",
  goal: "lose",
  goalKgPerWeek: 0.5,
  macroSplit: { protein: 30, carbs: 40, fat: 30 },
};

/** One version in effect since well before every range below. */
const profiles: ProfileVersion[] = [{ effectiveDate: "2026-01-01", profile }];

const weights: WeightEntry[] = [
  { id: 1, date: "2026-09-30", kg: 90 },
  { id: 2, date: "2026-10-03", kg: 80 },
];

/** Today's target for a day, from the same logic the history must reuse. */
function targetOn(date: string, weightKg: number, dayProfile: TodayProfile = profile): number {
  const summary = buildTodaySummary({
    today: date,
    profile: dayProfile,
    weightKg,
    food: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    exerciseKcal: [],
  });
  if (summary.status !== "ready") throw new Error("fixture profile must be complete");
  return summary.targetKcal;
}

describe("buildCalorieHistory", () => {
  const targetHeavy = targetOn("2026-10-01", 90);
  const targetLight = targetOn("2026-10-03", 80);

  const history = buildCalorieHistory({
    from: "2026-10-01",
    to: "2026-10-04",
    totals: [
      { date: "2026-10-01", foodKcal: targetHeavy + 400, exerciseKcal: 100 },
      { date: "2026-10-02", foodKcal: 0, exerciseKcal: 300 },
      { date: "2026-10-03", foodKcal: targetLight - 500.4, exerciseKcal: 0 },
    ],
    profiles,
    weights,
  });

  it("lists every day of the range, oldest first", () => {
    expect(history.days.map((day) => day.date)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
  });

  it("uses each day's weight on or before it for the target", () => {
    expect(history.days[0].targetKcal).toBe(targetHeavy);
    expect(history.days[2].targetKcal).toBe(targetLight);
    expect(targetHeavy).toBeGreaterThan(targetLight);
  });

  it("computes balance as food minus exercise minus target, in whole kcal", () => {
    expect(history.days[0]).toMatchObject({ netKcal: targetHeavy + 300, balanceKcal: 300, status: "over" });
    expect(history.days[2]).toMatchObject({ netKcal: targetLight - 500, balanceKcal: -500, status: "under" });
  });

  it("treats days without food as not logged, even with exercise", () => {
    expect(history.days[1]).toMatchObject({ foodKcal: 0, exerciseKcal: 300, balanceKcal: null, status: "unlogged" });
    expect(history.days[3]).toMatchObject({ foodKcal: 0, exerciseKcal: 0, balanceKcal: null, status: "unlogged" });
  });

  it("averages over logged days only", () => {
    expect(history.loggedDays).toBe(2);
    expect(history.hasTarget).toBe(true);
    expect(history.averageBalanceKcal).toBe(-100);
    expect(history.averageTargetKcal).toBe(Math.round((targetHeavy + targetLight) / 2));
    expect(history.underDays).toBe(1);
    expect(history.overDays).toBe(1);
  });

  it("counts a small balance as on target", () => {
    const close = buildCalorieHistory({
      from: "2026-10-03",
      to: "2026-10-03",
      totals: [{ date: "2026-10-03", foodKcal: targetLight + ON_TARGET_TOLERANCE_KCAL, exerciseKcal: 0 }],
      profiles,
      weights,
    });
    expect(close.days[0].status).toBe("on");
    expect(close.underDays + close.overDays).toBe(0);
  });

  it("has a target before any food is logged (nothing to average yet)", () => {
    const empty = buildCalorieHistory({ from: "2026-10-05", to: "2026-10-06", totals: [], profiles, weights });
    expect(empty.hasTarget).toBe(true);
    expect(empty.loggedDays).toBe(0);
    expect(empty.averageBalanceKcal).toBeNull();
    expect(empty.days.every((day) => day.status === "unlogged")).toBe(true);
  });

  it("has no targets without a usable profile or weight, but still reports net intake", () => {
    const noProfile = buildCalorieHistory({
      from: "2026-10-01",
      to: "2026-10-01",
      totals: [{ date: "2026-10-01", foodKcal: 2000, exerciseKcal: 250 }],
      profiles: [],
      weights,
    });
    expect(noProfile.hasTarget).toBe(false);
    expect(noProfile.days[0]).toMatchObject({ netKcal: 1750, targetKcal: null, balanceKcal: null });
    expect(noProfile.averageNetKcal).toBe(1750);
    expect(noProfile.averageBalanceKcal).toBeNull();

    const beforeFirstWeight = buildCalorieHistory({
      from: "2026-09-29",
      to: "2026-09-29",
      totals: [{ date: "2026-09-29", foodKcal: 2000, exerciseKcal: 0 }],
      profiles,
      weights,
    });
    expect(beforeFirstWeight.days[0].targetKcal).toBeNull();
  });

  it("scores each day against the profile version in effect that day", () => {
    const maintain: TodayProfile = { ...profile, goal: "maintain", goalKgPerWeek: 0 };
    const history = buildCalorieHistory({
      from: "2026-10-03",
      to: "2026-10-05",
      totals: [
        { date: "2026-10-03", foodKcal: 2000, exerciseKcal: 0 },
        { date: "2026-10-05", foodKcal: 2000, exerciseKcal: 0 },
      ],
      // Lost weight until the 4th, then switched to maintaining.
      profiles: [
        { effectiveDate: "2026-09-01", profile },
        { effectiveDate: "2026-10-04", profile: maintain },
      ],
      weights,
    });

    expect(history.days.map((day) => day.targetKcal)).toEqual([
      targetOn("2026-10-03", 80),
      targetOn("2026-10-04", 80, maintain),
      targetOn("2026-10-05", 80, maintain),
    ]);
    expect(history.days[0].targetKcal).toBeLessThan(history.days[2].targetKcal ?? 0);
  });

  it("uses the earliest version for days before the profile history starts", () => {
    const history = buildCalorieHistory({
      from: "2026-10-03",
      to: "2026-10-03",
      totals: [{ date: "2026-10-03", foodKcal: 2000, exerciseKcal: 0 }],
      profiles: [{ effectiveDate: "2026-10-20", profile }],
      weights,
    });
    expect(history.days[0].targetKcal).toBe(targetOn("2026-10-03", 80));
  });
});
