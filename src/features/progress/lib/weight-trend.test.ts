import { describe, expect, it } from "vitest";
import type { WeightEntry } from "./types";
import {
  buildWeightTrend,
  linePath,
  movingAverageKg,
  weightOnOrBefore,
  weightScale,
  withChangeFromPrevious,
  xPercent,
  yPercent,
} from "./weight-trend";

const entry = (id: number, date: string, kg: number): WeightEntry => ({ id, date, kg });

describe("movingAverageKg", () => {
  const entries = [entry(1, "2026-10-01", 80), entry(2, "2026-10-05", 79), entry(3, "2026-10-08", 78)];

  it("averages the entries of the 7 days ending on the date, skipping days without one", () => {
    expect(movingAverageKg(entries, "2026-10-05")).toBe(79.5);
    // 2026-10-01 is 7 days before the 8th: outside the window.
    expect(movingAverageKg(entries, "2026-10-08")).toBe(78.5);
  });

  it("is NaN when the window is empty", () => {
    expect(movingAverageKg(entries, "2026-09-20")).toBeNaN();
  });
});

describe("buildWeightTrend", () => {
  it("charts only the range, oldest first, with earlier entries feeding the average", () => {
    const trend = buildWeightTrend(
      [entry(3, "2026-10-12", 80.4), entry(1, "2026-10-08", 81), entry(2, "2026-10-10", 80.5)],
      "2026-10-10",
      "2026-10-16",
    );
    expect(trend.points).toEqual([
      { date: "2026-10-10", kg: 80.5, averageKg: 80.75 },
      { date: "2026-10-12", kg: 80.4, averageKg: 80.63 },
    ]);
    expect(trend.latest).toEqual(trend.points[1]);
    expect(trend.changeKg).toBe(-0.1);
    expect(trend.minKg).toBe(80.4);
    expect(trend.maxKg).toBe(80.5);
  });

  it("has no change with a single entry and no stats without entries", () => {
    expect(buildWeightTrend([entry(1, "2026-10-10", 70)], "2026-10-10", "2026-10-16").changeKg).toBeNull();
    expect(buildWeightTrend([], "2026-10-10", "2026-10-16")).toEqual({
      points: [],
      latest: null,
      changeKg: null,
      minKg: null,
      maxKg: null,
    });
  });
});

describe("weightOnOrBefore", () => {
  const sorted = [entry(1, "2026-10-01", 80), entry(2, "2026-10-05", 79)];

  it("finds the latest entry on or before the date", () => {
    expect(weightOnOrBefore(sorted, "2026-10-04")?.kg).toBe(80);
    expect(weightOnOrBefore(sorted, "2026-10-05")?.kg).toBe(79);
    expect(weightOnOrBefore(sorted, "2026-09-30")).toBeNull();
  });
});

describe("withChangeFromPrevious", () => {
  it("returns entries newest first with the change from the previous one", () => {
    expect(withChangeFromPrevious([entry(2, "2026-10-05", 79.3), entry(1, "2026-10-01", 80)])).toEqual([
      { id: 2, date: "2026-10-05", kg: 79.3, changeKg: -0.7 },
      { id: 1, date: "2026-10-01", kg: 80, changeKg: null },
    ]);
  });
});

describe("chart geometry", () => {
  it("pads a flat series to a 2 kg span with round ticks", () => {
    const scale = weightScale([{ date: "2026-10-01", kg: 80.2, averageKg: 80.2 }]);
    expect(scale.minKg).toBeLessThanOrEqual(79.2);
    expect(scale.maxKg).toBeGreaterThanOrEqual(81.2);
    expect(scale.ticks[0]).toBe(scale.minKg);
    expect(scale.ticks[scale.ticks.length - 1]).toBe(scale.maxKg);
    for (const tick of scale.ticks) expect(Math.round(tick * 2) / 2).toBe(tick);
  });

  it("covers every weight and average of a wide series", () => {
    const scale = weightScale([
      { date: "2026-10-01", kg: 92, averageKg: 92 },
      { date: "2026-10-30", kg: 84.6, averageKg: 85.1 },
    ]);
    expect(scale.minKg).toBeLessThanOrEqual(84.6);
    expect(scale.maxKg).toBeGreaterThanOrEqual(92);
    expect(scale.ticks.length).toBeGreaterThanOrEqual(3);
    expect(scale.ticks.length).toBeLessThanOrEqual(6);
  });

  it("maps dates left to right and weights top (max) to bottom (min)", () => {
    expect(xPercent("2026-10-01", "2026-10-01", "2026-10-31")).toBe(0);
    expect(xPercent("2026-10-16", "2026-10-01", "2026-10-31")).toBe(50);
    expect(xPercent("2026-10-31", "2026-10-01", "2026-10-31")).toBe(100);
    const scale = { minKg: 80, maxKg: 84, ticks: [80, 82, 84] };
    expect(yPercent(84, scale)).toBe(0);
    expect(yPercent(81, scale)).toBe(75);
    expect(yPercent(80, scale)).toBe(100);
  });

  it("builds an SVG path", () => {
    expect(linePath([])).toBe("");
    expect(
      linePath([
        { x: 0, y: 50 },
        { x: 100, y: 25 },
      ]),
    ).toBe("M0 50 L100 25");
  });
});
