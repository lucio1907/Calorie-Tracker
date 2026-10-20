import { describe, expect, it } from "vitest";
import { daysBetween, daysInRange, progressHref, rangeBounds, resolveProgressRange } from "./progress-range";

describe("resolveProgressRange", () => {
  it("accepts the offered ranges", () => {
    expect(resolveProgressRange("7")).toBe(7);
    expect(resolveProgressRange("30")).toBe(30);
    expect(resolveProgressRange("90")).toBe(90);
  });

  it("falls back to 30 days for anything else", () => {
    expect(resolveProgressRange(undefined)).toBe(30);
    expect(resolveProgressRange("365")).toBe(30);
    expect(resolveProgressRange("7days")).toBe(30);
    expect(resolveProgressRange(["7", "90"])).toBe(30);
  });
});

describe("rangeBounds", () => {
  it("ends today and includes it in the day count", () => {
    expect(rangeBounds(7, "2026-10-19")).toEqual({ from: "2026-10-13", to: "2026-10-19" });
    expect(rangeBounds(30, "2026-03-01")).toEqual({ from: "2026-01-31", to: "2026-03-01" });
  });
});

describe("daysBetween / daysInRange", () => {
  it("counts calendar days across month and DST boundaries", () => {
    expect(daysBetween("2026-10-01", "2026-10-19")).toBe(18);
    expect(daysBetween("2026-03-28", "2026-04-02")).toBe(5);
    expect(daysBetween("2026-10-19", "2026-10-18")).toBe(-1);
  });

  it("lists every day oldest first, or none for a reversed range", () => {
    expect(daysInRange("2026-02-27", "2026-03-02")).toEqual(["2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02"]);
    expect(daysInRange("2026-03-02", "2026-03-01")).toEqual([]);
  });
});

describe("progressHref", () => {
  it("uses the bare path for the default range", () => {
    expect(progressHref(30)).toBe("/progress");
    expect(progressHref(7)).toBe("/progress?range=7");
  });
});
