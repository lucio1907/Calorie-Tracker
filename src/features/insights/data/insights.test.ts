import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/** Minimal chainable stand-in for the supabase-js query builder and rpc. */
type Call = { table: string; op: string; payload?: unknown; filters: Array<[string, unknown]> };
const calls: Call[] = [];
const results: Array<{ data: unknown; error: unknown }> = [];
let rpcResult: { data: unknown; error: unknown } = { data: true, error: null };

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
  };
  return chain;
}

const rpc = vi.fn(() => Promise.resolve(rpcResult));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from, rpc }) }));

const { getStoredInsight, getStoredInsightOrNull, InsightLimitError, saveInsight, takeInsightSlot } = await import("./insights");

const content = { overview: "Venís bien.", wins: ["Registraste 5 días."], improvements: [] };
const row = { content, model: "nvidia/nemotron-3.5-lightning:free", generated_on: "2026-10-19", range_days: 7 };
const insight = { ...content, model: row.model, generatedOn: "2026-10-19", rangeDays: 7 };

beforeEach(() => {
  calls.length = 0;
  results.length = 0;
  rpc.mockClear();
  rpcResult = { data: true, error: null };
});

describe("getStoredInsight", () => {
  it("reads the caller's summary for the range and day", async () => {
    results.push({ data: row, error: null });

    await expect(getStoredInsight("user-a", 7, "2026-10-19")).resolves.toEqual(insight);
    expect(calls[0]).toMatchObject({
      table: "insights",
      filters: [
        ["owner_id", "user-a"],
        ["range_days", 7],
        ["generated_on", "2026-10-19"],
      ],
    });
  });

  it("is null when there is none", async () => {
    await expect(getStoredInsight("user-a", 7, "2026-10-19")).resolves.toBeNull();
  });

  it("is null when the stored content no longer matches the schema", async () => {
    results.push({ data: { ...row, content: { overview: "" } }, error: null });
    await expect(getStoredInsight("user-a", 7, "2026-10-19")).resolves.toBeNull();
  });

  it("throws on a read error", async () => {
    results.push({ data: null, error: { message: "boom" } });
    await expect(getStoredInsight("user-a", 7, "2026-10-19")).rejects.toThrow("boom");
  });
});

describe("takeInsightSlot", () => {
  it("takes one generation slot", async () => {
    await expect(takeInsightSlot()).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("consume_insight_request");
  });

  it("throws InsightLimitError when the day's limit is reached", async () => {
    rpcResult = { data: false, error: null };
    await expect(takeInsightSlot()).rejects.toBeInstanceOf(InsightLimitError);
  });

  it("throws on an RPC error", async () => {
    rpcResult = { data: null, error: { message: "denied" } };
    await expect(takeInsightSlot()).rejects.toThrow("consume_insight_request failed: denied");
  });
});

describe("saveInsight", () => {
  const input = { rangeDays: 7, day: "2026-10-19", content, model: row.model };

  it("inserts the summary without an owner id (the database sets it) and returns it", async () => {
    results.push({ data: row, error: null });

    await expect(saveInsight("user-a", input)).resolves.toEqual(insight);
    expect(calls[0]).toMatchObject({
      table: "insights",
      op: "insert",
      payload: { range_days: 7, generated_on: "2026-10-19", content, model: row.model },
    });
    expect(calls[0].payload).not.toHaveProperty("owner_id");
  });

  it("returns the stored summary when another request saved it first", async () => {
    const stored = { ...row, content: { ...content, overview: "La primera." } };
    results.push({ data: null, error: { code: "23505", message: "duplicate" } }, { data: stored, error: null });

    await expect(saveInsight("user-a", input)).resolves.toEqual({ ...insight, overview: "La primera." });
    expect(calls[1].op).toBe("select");
  });

  it("returns the new summary without storing it when the stored one no longer matches the schema", async () => {
    const stale = { ...row, content: { overview: "" } };
    results.push({ data: null, error: { code: "23505", message: "duplicate" } }, { data: stale, error: null });

    await expect(saveInsight("user-a", input)).resolves.toEqual({ ...insight, model: input.model });
  });

  it("throws on other insert errors", async () => {
    results.push({ data: null, error: { code: "23514", message: "check" } });
    await expect(saveInsight("user-a", input)).rejects.toThrow("check");
  });
});

describe("getStoredInsightOrNull", () => {
  it("is null instead of throwing on a read error, so the Progress screen still renders", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    results.push({ data: null, error: { message: "relation does not exist" } });

    await expect(getStoredInsightOrNull("user-a", 7, "2026-10-19")).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it("returns the stored summary", async () => {
    results.push({ data: row, error: null });
    await expect(getStoredInsightOrNull("user-a", 7, "2026-10-19")).resolves.toEqual(insight);
  });
});
