import { describe, expect, it } from "vitest";
import { insightsHref } from "./insights-href";

describe("insightsHref", () => {
  it("is the bare path for the default range and a ?range= link otherwise", () => {
    expect(insightsHref(30)).toBe("/insights");
    expect(insightsHref(7)).toBe("/insights?range=7");
    expect(insightsHref(90)).toBe("/insights?range=90");
  });
});
