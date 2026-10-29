import { describe, expect, it } from "vitest";
import { activityKcal, MAX_ENTRY_KCAL } from "./activity-kcal";

describe("activityKcal", () => {
  it("multiplies the MET above rest by weight and hours", () => {
    // Running 10 km/h (MET 9.3), 70 kg, 30 min: (9.3 - 1) x 70 x 0.5 = 290.5 -> 291.
    expect(activityKcal(9.3, 70, 30)).toEqual({ ok: true, kcal: 291 });
  });

  it("rounds to whole kcal", () => {
    // (3.5 - 1) x 80.5 x 45/60 = 150.9375.
    expect(activityKcal(3.5, 80.5, 45)).toEqual({ ok: true, kcal: 151 });
  });

  it("scales with the duration", () => {
    expect(activityKcal(7, 80, 60)).toEqual({ ok: true, kcal: 480 });
    expect(activityKcal(7, 80, 120)).toEqual({ ok: true, kcal: 960 });
  });

  it("rejects non-positive or non-finite inputs instead of throwing", () => {
    expect(activityKcal(0, 80, 30)).toEqual({ ok: false, error: "invalid" });
    expect(activityKcal(7, 0, 30)).toEqual({ ok: false, error: "invalid" });
    expect(activityKcal(7, 80, -1)).toEqual({ ok: false, error: "invalid" });
    expect(activityKcal(7, 80, Number.NaN)).toEqual({ ok: false, error: "invalid" });
  });

  it("rejects a snapshot the kcal column cannot hold", () => {
    // (MET 30 - 1) x 400 kg x 24 h = 278400 kcal.
    expect(activityKcal(30, 400, 1440)).toEqual({ ok: false, error: "too_large" });
    expect(MAX_ENTRY_KCAL).toBe(99_999.99);
  });
});
