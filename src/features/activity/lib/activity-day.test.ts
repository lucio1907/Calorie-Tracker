import { describe, expect, it } from "vitest";
import { buildActivityDay } from "./activity-day";
import type { ActivityEntry } from "./types";

const run: ActivityEntry = { id: 1, activityId: 8, label: "Running, 10 km/h", minutes: 30, kcal: 326 };
const yoga: ActivityEntry = { id: 2, activityId: 21, label: "Yoga, general", minutes: 45.5, kcal: 120.1 };

describe("buildActivityDay", () => {
  it("keeps the entries in order and totals kcal and minutes", () => {
    const day = buildActivityDay([run, yoga]);
    expect(day.entries.map((entry) => entry.id)).toEqual([1, 2]);
    expect(day.totalKcal).toBe(446.1);
    expect(day.totalMinutes).toBe(75.5);
  });

  it("sums in hundredths so totals do not drift", () => {
    const day = buildActivityDay([
      { ...run, kcal: 0.1 },
      { ...yoga, kcal: 0.2 },
    ]);
    expect(day.totalKcal).toBe(0.3);
  });

  it("is empty with zero totals for a day without entries", () => {
    expect(buildActivityDay([])).toEqual({ entries: [], totalKcal: 0, totalMinutes: 0 });
  });
});
