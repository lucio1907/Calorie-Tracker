import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/** Minimal chainable stand-in for the supabase-js query builder. */
type Call = { table: string; op: string; payload?: unknown; filters: Array<[string, unknown]> };
const calls: Call[] = [];
const results: Array<{ data: unknown; error: unknown }> = [];

function from(table: string) {
  const call: Call = { table, op: "select", filters: [] };
  calls.push(call);
  const settle = () => Promise.resolve(results.shift() ?? { data: null, error: null });
  const chain = {
    select: () => chain,
    insert: (payload: unknown) => ((call.op = "insert"), (call.payload = payload), chain),
    eq: (column: string, value: unknown) => (call.filters.push([column, value]), chain),
    maybeSingle: settle,
    single: settle,
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => settle().then(resolve, reject),
  };
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from }) }));

const { getStoredAnswer, listAnswers, saveAnswer } = await import("./insight-answers");

const content = { answer: "Tu peso bajó menos de lo esperado.", tips: ["Pesá las porciones."] };
const row = { question: "weight", content, model: "test-model", generated_on: "2026-10-19", range_days: 7 };
const answer = { ...content, question: "weight", model: "test-model", generatedOn: "2026-10-19", rangeDays: 7 };

beforeEach(() => {
  calls.length = 0;
  results.length = 0;
});

describe("listAnswers", () => {
  it("reads the caller's answers for the range and day, in question order", async () => {
    results.push({ data: [{ ...row, question: "consistency" }, row], error: null });

    await expect(listAnswers("user-a", 7, "2026-10-19")).resolves.toEqual([answer, { ...answer, question: "consistency" }]);
    expect(calls[0]).toMatchObject({
      table: "insight_answers",
      filters: [
        ["owner_id", "user-a"],
        ["range_days", 7],
        ["generated_on", "2026-10-19"],
      ],
    });
  });

  it("leaves out rows with an unknown question or content that no longer matches the schema", async () => {
    results.push({ data: [{ ...row, question: "other" }, { ...row, content: { answer: "" } }, row], error: null });
    await expect(listAnswers("user-a", 7, "2026-10-19")).resolves.toEqual([answer]);
  });

  it("throws on a read error", async () => {
    results.push({ data: null, error: { message: "boom" } });
    await expect(listAnswers("user-a", 7, "2026-10-19")).rejects.toThrow("boom");
  });
});

describe("getStoredAnswer", () => {
  it("reads one question's answer for the range and day", async () => {
    results.push({ data: row, error: null });

    await expect(getStoredAnswer("user-a", "weight", 7, "2026-10-19")).resolves.toEqual(answer);
    expect(calls[0].filters).toEqual([
      ["owner_id", "user-a"],
      ["question", "weight"],
      ["range_days", 7],
      ["generated_on", "2026-10-19"],
    ]);
  });

  it("is null when there is none", async () => {
    await expect(getStoredAnswer("user-a", "weight", 7, "2026-10-19")).resolves.toBeNull();
  });

  it("is null when the stored content no longer matches the schema", async () => {
    results.push({ data: { ...row, content: { answer: "" } }, error: null });
    await expect(getStoredAnswer("user-a", "weight", 7, "2026-10-19")).resolves.toBeNull();
  });

  it("throws on a read error, naming the question but not the content", async () => {
    results.push({ data: null, error: { message: "boom" } });

    const error = await getStoredAnswer("user-a", "weight", 7, "2026-10-19").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("insight answer weight 7d on 2026-10-19: boom");
  });
});

describe("saveAnswer", () => {
  const input = { question: "weight" as const, rangeDays: 7, day: "2026-10-19", content, model: "test-model" };

  it("inserts the answer without an owner id (the database sets it) and returns it", async () => {
    results.push({ data: row, error: null });

    await expect(saveAnswer("user-a", input)).resolves.toEqual(answer);
    expect(calls[0]).toMatchObject({
      table: "insight_answers",
      op: "insert",
      payload: { question: "weight", range_days: 7, generated_on: "2026-10-19", content, model: "test-model" },
    });
    expect(calls[0].payload).not.toHaveProperty("owner_id");
  });

  it("returns the stored answer when another request saved it first", async () => {
    const stored = { ...row, content: { answer: "First.", tips: [] } };
    results.push({ data: null, error: { code: "23505", message: "duplicate" } }, { data: stored, error: null });

    await expect(saveAnswer("user-a", input)).resolves.toEqual({ ...answer, answer: "First.", tips: [] });
  });

  it("throws on other insert errors", async () => {
    results.push({ data: null, error: { code: "42501", message: "denied" } });
    await expect(saveAnswer("user-a", input)).rejects.toThrow("denied");
  });
});
