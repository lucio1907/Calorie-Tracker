import { describe, expect, it } from "vitest";
import { applyWaivers, failingAdvisories } from "./audit.mjs";

const BRACES = {
  source: 1,
  name: "braces",
  dependency: "braces",
  title: "braces vulnerable to stack-exhaustion denial of service",
  url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
  severity: "high",
  range: "<=3.0.3",
};

const report = {
  vulnerabilities: {
    braces: { via: [BRACES] },
    micromatch: { via: ["braces"] },
    other: { via: [{ ...BRACES, name: "other", url: "https://github.com/advisories/GHSA-dddd-eeee-ffff", severity: "critical", title: "other" }] },
    quiet: { via: [{ ...BRACES, name: "quiet", url: "https://github.com/advisories/GHSA-gggg-hhhh-iiii", severity: "moderate" }] },
  },
};

describe("failingAdvisories", () => {
  it("keeps high and critical advisories once each, and skips package-to-package links", () => {
    expect(failingAdvisories(report).map((advisory) => [advisory.id, advisory.severity, advisory.packages])).toEqual([
      ["GHSA-aaaa-bbbb-cccc", "high", ["braces"]],
      ["GHSA-dddd-eeee-ffff", "critical", ["other"]],
    ]);
  });

  it("lists every package an advisory was reported on", () => {
    const twice = { vulnerabilities: { a: { via: [BRACES] }, b: { via: [{ ...BRACES, name: "braces-fork" }] } } };
    expect(failingAdvisories(twice)[0].packages).toEqual(["braces", "braces-fork"]);
  });

  it("returns nothing for a clean report", () => {
    expect(failingAdvisories({ vulnerabilities: {} })).toEqual([]);
  });
});

describe("applyWaivers", () => {
  const waiver = { id: "GHSA-aaaa-bbbb-cccc", reason: "dev only", reviewBy: "2027-01-21" };

  it("covers a waived advisory until its review date, inclusive", () => {
    const result = applyWaivers(report, [waiver], "2027-01-21");
    expect(result.waived.map((advisory) => advisory.id)).toEqual(["GHSA-aaaa-bbbb-cccc"]);
    expect(result.unwaived.map((advisory) => advisory.id)).toEqual(["GHSA-dddd-eeee-ffff"]);
    expect(result.expired).toEqual([]);
  });

  it("stops covering an advisory once the waiver is past its review date", () => {
    const result = applyWaivers(report, [waiver], "2027-01-22");
    expect(result.expired.map((advisory) => advisory.id)).toEqual(["GHSA-aaaa-bbbb-cccc"]);
    expect(result.waived).toEqual([]);
  });

  it("reports waivers that no longer match any advisory", () => {
    const stale = { id: "GHSA-zzzz-zzzz-zzzz", reason: "fixed upstream", reviewBy: "2027-01-21" };
    expect(applyWaivers(report, [waiver, stale], "2026-10-21").unused).toEqual([stale]);
  });
});
