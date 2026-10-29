import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/** Minimal table-aware stand-in for the supabase-js query builder and rpc. */
type Query = { table: string; filters: Array<[string, string, unknown]>; single: boolean };
const queries: Query[] = [];
const rpcCalls: Array<{ name: string; args: unknown }> = [];
let tableRows: Record<string, unknown[]> = {};
/** What .maybeSingle() answers per table (null when absent). */
let singleRows: Record<string, unknown> = {};
let rpcRows: Record<string, unknown[]> = {};

function from(table: string) {
  const query: Query = { table, filters: [], single: false };
  queries.push(query);
  const rows = () => tableRows[table] ?? [];
  const filter = (op: string) => (column: string, value: unknown) => (query.filters.push([op, column, value]), chain);
  const chain = {
    select: () => chain,
    eq: filter("eq"),
    gte: filter("gte"),
    gt: filter("gt"),
    lte: filter("lte"),
    lt: filter("lt"),
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => ((query.single = true), Promise.resolve({ data: singleRows[table] ?? null, error: null })),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows(), error: null }).then(resolve),
  };
  return chain;
}

function rpc(name: string, args: unknown) {
  rpcCalls.push({ name, args });
  return Promise.resolve(name in rpcRows ? { data: rpcRows[name], error: null } : { data: null, error: { message: "boom" } });
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from, rpc }) }));

const { getDailyMacroTotals } = await import("./progress");
const { loadProgressData } = await import("./load-progress");

beforeEach(() => {
  queries.length = 0;
  rpcCalls.length = 0;
  tableRows = {};
  singleRows = {};
  rpcRows = {};
});

describe("getDailyMacroTotals", () => {
  it("reads daily_macro_totals for the range and maps the rows", async () => {
    rpcRows.daily_macro_totals = [{ entry_date: "2026-10-14", protein_g: "120.5", carbs_g: 200, fat_g: "60" }];

    await expect(getDailyMacroTotals("2026-10-13", "2026-10-19")).resolves.toEqual([
      { date: "2026-10-14", protein: 120.5, carbs: 200, fat: 60 },
    ]);
    expect(rpcCalls).toEqual([{ name: "daily_macro_totals", args: { start_date: "2026-10-13", end_date: "2026-10-19" } }]);
  });

  it("throws when the RPC fails", async () => {
    await expect(getDailyMacroTotals("2026-10-13", "2026-10-19")).rejects.toThrow("macro totals 2026-10-13..2026-10-19: boom");
  });
});

describe("loadProgressData", () => {
  it("reads a week before the range for the moving average and builds the page's numbers", async () => {
    tableRows.weight_entries = [
      { id: 1, entry_date: "2026-10-10", kg: "80" },
      { id: 2, entry_date: "2026-10-15", kg: "79.5" },
    ];
    singleRows.weight_entries = { id: 0, entry_date: "2026-10-01", kg: "81" };
    rpcRows.daily_energy_totals = [{ entry_date: "2026-10-15", food_kcal: "1800", exercise_kcal: "200" }];

    const data = await loadProgressData("user-a", 7, "2026-10-19");

    expect(data.from).toBe("2026-10-13");
    expect(data.to).toBe("2026-10-19");
    const weights = queries.filter((query) => query.table === "weight_entries");
    // The range read starts 6 days before `from`; the "latest before" read uses the same day.
    expect(weights[0].filters).toEqual(
      expect.arrayContaining([
        ["eq", "user_id", "user-a"],
        ["gte", "entry_date", "2026-10-07"],
        ["lte", "entry_date", "2026-10-19"],
      ]),
    );
    expect(weights[1].filters).toEqual(expect.arrayContaining([["lt", "entry_date", "2026-10-07"]]));
    expect(rpcCalls).toEqual([{ name: "daily_energy_totals", args: { start_date: "2026-10-13", end_date: "2026-10-19" } }]);

    expect(data.history.days).toHaveLength(7);
    expect(data.history.loggedDays).toBe(1);
    expect(data.trend.points.map((point) => point.date)).toEqual(["2026-10-15"]);
    // The log only lists entries inside the range; the earlier one feeds the average.
    expect(data.log.map((entry) => entry.date)).toEqual(["2026-10-15"]);
    expect(data.latestKg).toBe(79.5);
    // The latest weight before the window gives early days a target.
    expect(data.weights.map((entry) => entry.date)).toEqual(["2026-10-01", "2026-10-10", "2026-10-15"]);
  });
});
