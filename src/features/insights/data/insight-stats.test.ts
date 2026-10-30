import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCalorieHistory } from "@/features/progress/lib/calorie-history";
import { buildWeightTrend } from "@/features/progress/lib/weight-trend";

vi.mock("server-only", () => ({}));

const getDailyMacroTotals = vi.fn();
vi.mock("@/features/progress/data/progress", () => ({
  getDailyMacroTotals: (...args: unknown[]) => getDailyMacroTotals(...args),
}));

const { loadInsightStats } = await import("./insight-stats");

const FROM = "2026-10-13";
const TO = "2026-10-19";
const progress = {
  from: FROM,
  to: TO,
  weights: [],
  profiles: [],
  trend: buildWeightTrend([], FROM, TO),
  log: [],
  latestKg: null,
  history: buildCalorieHistory({ from: FROM, to: TO, totals: [{ date: "2026-10-15", foodKcal: 1800, exerciseKcal: 0 }], profiles: [], weights: [] }),
};

beforeEach(() => {
  getDailyMacroTotals.mockReset();
});

describe("loadInsightStats", () => {
  it("reads the range's macros and builds the stats from the progress data", async () => {
    getDailyMacroTotals.mockResolvedValue([{ date: "2026-10-15", protein: 90, carbs: 200, fat: 60 }]);

    await expect(loadInsightStats(progress, 7)).resolves.toEqual({
      balanceVsGoal: null,
      averageBalanceKcal: null,
      macros: [
        { key: "protein", averageG: 90, targetG: null },
        { key: "carbs", averageG: 200, targetG: null },
        { key: "fat", averageG: 60, targetG: null },
      ],
    });
    expect(getDailyMacroTotals).toHaveBeenCalledWith(FROM, TO);
  });

  it("is null instead of throwing when the macro read fails, so the page still renders", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    getDailyMacroTotals.mockRejectedValue(new Error("boom"));

    await expect(loadInsightStats(progress, 7)).resolves.toBeNull();
    expect(String(log.mock.calls[0][0])).toMatch(/^\[insights\]/);
    log.mockRestore();
  });
});
