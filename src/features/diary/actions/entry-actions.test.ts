import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FoodDetail } from "@/features/foods/lib/types";
import { initialEntryFormState } from "../lib/types";
import { diaryStrings } from "../strings";

vi.mock("server-only", () => ({}));

const refresh = vi.fn();
vi.mock("next/cache", () => ({ refresh: () => refresh() }));

const getCurrentUser = vi.fn();
vi.mock("@/features/auth/data/current-user", () => ({ getCurrentUser: () => getCurrentUser() }));

const getFoodDetail = vi.fn();
vi.mock("@/features/foods/data/foods", () => ({
  getFoodDetail: (id: number, userId: string) => getFoodDetail(id, userId),
}));

/** Minimal chainable stand-in for the supabase-js query builder. */
type Call = { table: string; op: string; payload?: unknown; filters: Array<[string, unknown]> };
const calls: Call[] = [];
let nextResult: { data: unknown; error: unknown } = { data: null, error: null };
const results: Array<{ data: unknown; error: unknown }> = [];

function builder(table: string) {
  const call: Call = { table, op: "select", filters: [] };
  calls.push(call);
  const settle = () => Promise.resolve(results.shift() ?? nextResult);
  const chain = {
    select: () => chain,
    insert: (payload: unknown) => ((call.op = "insert"), (call.payload = payload), chain),
    update: (payload: unknown) => ((call.op = "update"), (call.payload = payload), chain),
    delete: () => ((call.op = "delete"), chain),
    eq: (column: string, value: unknown) => (call.filters.push([column, value]), chain),
    maybeSingle: settle,
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => settle().then(resolve, reject),
  };
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: builder }) }));

const { createEntry, deleteEntry, updateEntry } = await import("./entry-actions");

const USER = { id: "user-a", email: null };
const t = diaryStrings;

const bread: FoodDetail = {
  id: 7,
  name: "Pan francés",
  brand: null,
  source: "argenfoods",
  group: null,
  barcode: null,
  externalCode: null,
  kcal: 269,
  protein: 9.3,
  carbs: 57.4,
  fat: 0.2,
  fiber: null,
  sodiumMg: null,
  isOwn: false,
  isFavorite: false,
  portions: [{ id: 3, label: "1 roll", grams: 50 }],
};

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  calls.length = 0;
  results.length = 0;
  nextResult = { data: null, error: null };
  refresh.mockReset();
  getCurrentUser.mockReset().mockResolvedValue(USER);
  getFoodDetail.mockReset().mockResolvedValue(bread);
});

describe("createEntry", () => {
  const fields = { date: "2026-10-14", meal: "breakfast", foodId: "7", unit: "3", amount: "1,5" };

  it("stores grams and a snapshot computed on the server from the stored food", async () => {
    // Extra fields a forged request might add are ignored.
    const state = await createEntry(initialEntryFormState, form({ ...fields, kcal: "1", user_id: "user-b" }));

    expect(state.status).toBe("saved");
    expect(getFoodDetail).toHaveBeenCalledWith(7, USER.id);
    expect(calls).toEqual([
      {
        table: "food_entries",
        op: "insert",
        filters: [],
        payload: {
          user_id: USER.id,
          entry_date: "2026-10-14",
          meal: "breakfast",
          food_id: 7,
          label: "Pan francés",
          grams: 75,
          quantity: 1.5,
          portion_label: "1 roll",
          kcal: 201.75,
          protein: 6.98,
          carbs: 43.05,
          fat: 0.15,
        },
      },
    ]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("requires a session", async () => {
    getCurrentUser.mockResolvedValue(null);
    const state = await createEntry(initialEntryFormState, form(fields));
    expect(state).toMatchObject({ status: "error", formError: t.errors.unauthorized });
    expect(calls).toHaveLength(0);
  });

  it("returns field errors without touching the database", async () => {
    const state = await createEntry(initialEntryFormState, form({ ...fields, amount: "" }));
    expect(state).toMatchObject({ status: "error", fieldErrors: { amount: t.validation.required } });
    expect(getFoodDetail).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it("fails when the food is not visible to the caller", async () => {
    getFoodDetail.mockResolvedValue(null);
    const state = await createEntry(initialEntryFormState, form(fields));
    expect(state).toMatchObject({ status: "error", formError: t.errors.foodMissing });
    expect(calls).toHaveLength(0);
  });

  it("flags a portion that no longer exists", async () => {
    const state = await createEntry(initialEntryFormState, form({ ...fields, unit: "99" }));
    expect(state).toMatchObject({ status: "error", fieldErrors: { unit: t.errors.portionMissing } });
  });

  it("rejects a total above the per-entry limit", async () => {
    // 200 rolls x 50 g = 10000 g.
    const state = await createEntry(initialEntryFormState, form({ ...fields, amount: "200" }));
    expect(state).toMatchObject({ status: "error", fieldErrors: { amount: t.validation.totalTooLarge(5000) } });
  });

  it("reports a database error without refreshing", async () => {
    nextResult = { data: null, error: { code: "23514", message: "check violation" } };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const state = await createEntry(initialEntryFormState, form(fields));
    expect(state).toMatchObject({ status: "error", formError: t.errors.saveFailed });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("updateEntry", () => {
  const logged = { id: 42, food_id: 7, grams: 50, quantity: 1, portion_label: "1 roll" };

  it("moves the entry to another meal without recomputing an unchanged amount", async () => {
    results.push({ data: logged, error: null }, { data: { id: 42 }, error: null });
    const state = await updateEntry(
      initialEntryFormState,
      form({ entryId: "42", meal: "dinner", unit: "3", amount: "1" }),
    );

    expect(state.status).toBe("saved");
    expect(calls[0]).toMatchObject({ op: "select", filters: [["id", 42], ["user_id", USER.id]] });
    expect(calls[1]).toEqual({
      table: "food_entries",
      op: "update",
      payload: { meal: "dinner" },
      filters: [["id", 42], ["user_id", USER.id]],
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("recomputes grams and the snapshot when the amount changes", async () => {
    results.push({ data: logged, error: null }, { data: { id: 42 }, error: null });
    await updateEntry(initialEntryFormState, form({ entryId: "42", meal: "lunch", unit: "g", amount: "100" }));
    expect(calls[1].payload).toEqual({
      meal: "lunch",
      grams: 100,
      quantity: null,
      portion_label: null,
      kcal: 269,
      protein: 9.3,
      carbs: 57.4,
      fat: 0.2,
    });
  });

  it("only changes the meal of an entry whose food was deleted", async () => {
    results.push({ data: { ...logged, food_id: null }, error: null }, { data: { id: 42 }, error: null });
    const state = await updateEntry(initialEntryFormState, form({ entryId: "42", meal: "snack" }));
    expect(state.status).toBe("saved");
    expect(getFoodDetail).not.toHaveBeenCalled();
    expect(calls[1].payload).toEqual({ meal: "snack" });
  });

  it("refuses a new amount for an entry whose food was deleted", async () => {
    results.push({ data: { ...logged, food_id: null }, error: null });
    const state = await updateEntry(
      initialEntryFormState,
      form({ entryId: "42", meal: "snack", unit: "g", amount: "10" }),
    );
    expect(state).toMatchObject({ status: "error", formError: t.errors.foodMissing });
    expect(calls).toHaveLength(1);
  });

  it("reports an entry the caller cannot see", async () => {
    results.push({ data: null, error: null });
    const state = await updateEntry(initialEntryFormState, form({ entryId: "42", meal: "snack" }));
    expect(state).toMatchObject({ status: "error", formError: t.errors.entryMissing });
    expect(calls).toHaveLength(1);
  });
});

describe("deleteEntry", () => {
  it("deletes only the caller's entry and refreshes", async () => {
    nextResult = { data: [{ id: 42 }], error: null };
    await expect(deleteEntry(42)).resolves.toEqual({ ok: true, data: undefined });
    expect(calls[0]).toMatchObject({ op: "delete", filters: [["id", 42], ["user_id", USER.id]] });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("reports an entry that is gone (or not the caller's)", async () => {
    nextResult = { data: [], error: null };
    await expect(deleteEntry(42)).resolves.toEqual({ ok: false, error: t.errors.entryMissing });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("rejects a malformed id", async () => {
    await expect(deleteEntry(-1)).resolves.toEqual({ ok: false, error: t.errors.deleteFailed });
    expect(calls).toHaveLength(0);
  });
});
