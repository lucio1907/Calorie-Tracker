import { describe, expect, it } from "vitest";
import { answerContentSchema, isQuestionKey, QUESTION_KEYS } from "./insight-questions";

describe("QUESTION_KEYS", () => {
  it("are the four questions the database accepts, in display order", () => {
    expect(QUESTION_KEYS).toEqual(["weight", "protein", "weekend", "consistency"]);
  });

  it.each([
    ["weight", true],
    ["consistency", true],
    ["anything", false],
    [7, false],
    [null, false],
  ])("recognises %s as a question: %s", (value, expected) => {
    expect(isQuestionKey(value)).toBe(expected);
  });
});

describe("answerContentSchema", () => {
  const valid = { answer: "  Tu peso bajó menos de lo esperado.  ", tips: ["Pesá las porciones."] };

  it("accepts a well-formed answer, trimming text and dropping unknown keys", () => {
    const parsed = answerContentSchema.parse({ ...valid, extra: "ignored" });

    expect(parsed).toEqual({ answer: "Tu peso bajó menos de lo esperado.", tips: ["Pesá las porciones."] });
    expect(parsed).not.toHaveProperty("extra");
  });

  it("accepts a little over the requested lengths and keeps only the first 3 tips", () => {
    const parsed = answerContentSchema.parse({ answer: "a".repeat(1100), tips: ["a", "b", "c", "d"] });

    expect(parsed.answer).toHaveLength(1100);
    expect(parsed.tips).toEqual(["a", "b", "c"]);
  });

  it.each([
    ["an empty answer", { answer: " ", tips: [] }],
    ["an answer over the hard cap", { answer: "a".repeat(1201), tips: [] }],
    ["a tip over the hard cap", { answer: "a", tips: ["b".repeat(301)] }],
    ["too many tips", { answer: "a", tips: Array.from({ length: 11 }, () => "b") }],
    ["missing tips", { answer: "a" }],
  ])("rejects %s", (_label, value) => {
    expect(answerContentSchema.safeParse(value).success).toBe(false);
  });
});
