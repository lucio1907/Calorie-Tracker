import { describe, expect, it } from "vitest";
import { insightContentSchema } from "./insight-schema";

const valid = {
  overview: "  Venís bien: registraste 5 de 7 días.  ",
  wins: ["Promediaste 1850 kcal netas."],
  improvements: ["Sumá 20 g de proteína por día.", "Registrá los fines de semana."],
};

describe("insightContentSchema", () => {
  it("accepts a well-formed answer, trimming text and dropping unknown keys", () => {
    const parsed = insightContentSchema.parse({ ...valid, extra: "ignored" });

    expect(parsed).toEqual({ ...valid, overview: "Venís bien: registraste 5 de 7 días." });
    expect(parsed).not.toHaveProperty("extra");
  });

  it("accepts empty wins and improvements", () => {
    expect(insightContentSchema.safeParse({ ...valid, wins: [], improvements: [] }).success).toBe(true);
  });

  // The prompt asks for 400 / 200 characters and 3 items; a model that runs a
  // little over still yields a summary instead of a wasted daily attempt.
  it("accepts a little over the requested lengths and keeps only the first 3 items", () => {
    const parsed = insightContentSchema.parse({
      overview: "a".repeat(700),
      wins: ["a", "b", "c", "d"],
      improvements: ["b".repeat(300), "c", "d", "e"],
    });
    expect(parsed.overview).toHaveLength(700);
    expect(parsed.wins).toEqual(["a", "b", "c"]);
    expect(parsed.improvements).toEqual(["b".repeat(300), "c", "d"]);
  });

  it.each([
    ["an empty overview", { ...valid, overview: "   " }],
    ["an overview over the 800-character hard cap", { ...valid, overview: "a".repeat(801) }],
    ["more than 10 wins", { ...valid, wins: Array.from({ length: 11 }, () => "a") }],
    ["an empty item", { ...valid, wins: [" "] }],
    ["an item over the 300-character hard cap", { ...valid, improvements: ["a".repeat(301)] }],
    ["a non-string item", { ...valid, wins: [3] }],
    ["a missing field", { overview: valid.overview, wins: [] }],
  ])("rejects %s", (_label, value) => {
    expect(insightContentSchema.safeParse(value).success).toBe(false);
  });
});
