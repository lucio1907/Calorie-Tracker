import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialWeightEntryFormState } from "../lib/types";
import { progressStrings } from "../strings";

vi.mock("server-only", () => ({}));

const refresh = vi.fn();
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  refresh: () => refresh(),
  revalidatePath: (path: string) => revalidatePath(path),
}));

const getCurrentUser = vi.fn();
vi.mock("@/features/auth/data/current-user", () => ({ getCurrentUser: () => getCurrentUser() }));

/** Minimal chainable stand-in for the supabase-js query builder. */
type Call = { table: string; op: string; payload?: unknown; options?: unknown; filters: Array<[string, unknown]> };
const calls: Call[] = [];
const results: Array<{ data: unknown; error: unknown }> = [];

function builder(table: string) {
  const call: Call = { table, op: "select", filters: [] };
  calls.push(call);
  const settle = () => Promise.resolve(results.shift() ?? { data: null, error: null });
  const chain = {
    select: () => chain,
    upsert: (payload: unknown, options: unknown) => (
      (call.op = "upsert"), (call.payload = payload), (call.options = options), chain
    ),
    update: (payload: unknown) => ((call.op = "update"), (call.payload = payload), chain),
    delete: () => ((call.op = "delete"), chain),
    eq: (column: string, value: unknown) => (call.filters.push([column, value]), chain),
    maybeSingle: settle,
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => settle().then(resolve, reject),
  };
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: builder }) }));

const { deleteWeightEntry, saveWeightEntry, updateWeightEntry } = await import("./weight-actions");

const USER = { id: "user-a", email: null };
const t = progressStrings;

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  // 01:30 UTC on the 20th is still the 19th in Buenos Aires (UTC-3).
  vi.setSystemTime(new Date("2026-10-20T01:30:00Z"));
  calls.length = 0;
  results.length = 0;
  refresh.mockReset();
  revalidatePath.mockReset();
  getCurrentUser.mockReset().mockResolvedValue(USER);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("saveWeightEntry", () => {
  it("upserts the caller's weight for the date and refreshes the dependent screens", async () => {
    const state = await saveWeightEntry(
      initialWeightEntryFormState,
      form({ date: "2026-10-19", kg: "80,5", user_id: "user-b" }),
    );

    expect(state).toEqual({ status: "saved", fieldErrors: {}, formError: null, values: {} });
    expect(calls).toEqual([
      {
        table: "weight_entries",
        op: "upsert",
        payload: { user_id: USER.id, entry_date: "2026-10-19", kg: 80.5 },
        options: { onConflict: "user_id,entry_date" },
        filters: [],
      },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/today");
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("refuses a date after today in the app time zone (not the UTC day)", async () => {
    const state = await saveWeightEntry(initialWeightEntryFormState, form({ date: "2026-10-20", kg: "80" }));

    expect(state.status).toBe("error");
    expect(state.fieldErrors).toEqual({ date: t.validation.futureDate });
    expect(calls).toEqual([]);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("requires a session", async () => {
    getCurrentUser.mockResolvedValue(null);
    const state = await saveWeightEntry(initialWeightEntryFormState, form({ date: "2026-10-19", kg: "80" }));

    expect(state.formError).toBe(t.errors.unauthorized);
    expect(calls).toEqual([]);
  });

  it("reports a database failure without refreshing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    results.push({ data: null, error: { code: "XX000", message: "boom" } });
    const state = await saveWeightEntry(initialWeightEntryFormState, form({ date: "2026-10-19", kg: "80" }));

    expect(state).toMatchObject({ status: "error", formError: t.errors.saveFailed, values: { date: "2026-10-19", kg: "80" } });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("updateWeightEntry", () => {
  const fields = { entryId: "7", date: "2026-10-18", kg: "79.9" };

  it("updates only the caller's entry", async () => {
    results.push({ data: { id: 7 }, error: null });
    const state = await updateWeightEntry(initialWeightEntryFormState, form(fields));

    expect(state.status).toBe("saved");
    expect(calls).toEqual([
      {
        table: "weight_entries",
        op: "update",
        payload: { entry_date: "2026-10-18", kg: 79.9 },
        filters: [
          ["id", 7],
          ["user_id", USER.id],
        ],
      },
    ]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("explains a date that already has a weight", async () => {
    results.push({ data: null, error: { code: "23505", message: "duplicate key" } });
    const state = await updateWeightEntry(initialWeightEntryFormState, form(fields));

    expect(state).toMatchObject({ status: "error", fieldErrors: { date: t.validation.dateTaken } });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reports an entry that no longer exists (or is not the caller's)", async () => {
    results.push({ data: null, error: null });
    const state = await updateWeightEntry(initialWeightEntryFormState, form(fields));

    expect(state.formError).toBe(t.errors.entryMissing);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("deleteWeightEntry", () => {
  it("deletes the caller's entry", async () => {
    results.push({ data: [{ id: 7 }], error: null });

    await expect(deleteWeightEntry(7)).resolves.toEqual({ ok: true, data: undefined });
    expect(calls[0]).toMatchObject({
      op: "delete",
      filters: [
        ["id", 7],
        ["user_id", USER.id],
      ],
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("rejects a bad id and a missing entry", async () => {
    await expect(deleteWeightEntry(-3)).resolves.toEqual({ ok: false, error: t.errors.deleteFailed });
    results.push({ data: [], error: null });
    await expect(deleteWeightEntry(8)).resolves.toEqual({ ok: false, error: t.errors.entryMissing });
    expect(refresh).not.toHaveBeenCalled();
  });
});
