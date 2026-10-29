import { describe, expect, it } from "vitest";
import type { Insight } from "./insight-schema";
import { pastInsights } from "./past-insights";

function insight(rangeDays: Insight["rangeDays"], generatedOn: string): Insight {
  return { rangeDays, generatedOn, model: "m", overview: "o", wins: [], improvements: [] } as unknown as Insight;
}

describe("pastInsights", () => {
  it("leaves out only the summary the generate card already shows", () => {
    const history = [insight(7, "2026-10-29"), insight(30, "2026-10-29"), insight(30, "2026-10-28")];

    expect(pastInsights(history, 30, "2026-10-29")).toEqual([insight(7, "2026-10-29"), insight(30, "2026-10-28")]);
  });
});
