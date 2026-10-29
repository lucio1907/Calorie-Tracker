import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogActivity } from "../lib/types";
import { initialActivityFormState } from "../lib/types";
import { activityStrings } from "../strings";

vi.mock("server-only", () => ({}));

const refresh = vi.fn();
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  refresh: () => refresh(),
  revalidatePath: (path: string) => revalidatePath(path),
}));

const getCurrentUser = vi.fn();
vi.mock("@/features/auth/data/current-user", () => ({ getCurrentUser: () => getCurrentUser() }));

const getActivity = vi.fn();
vi.mock("../data/activity", () => ({ getActivity: (id: number) => getActivity(id) }));

const getLatestWeight = vi.fn();
vi.mock("@/features/settings/data/settings", () => ({
  getLatestWeight: (userId: string, date: string) => getLatestWeight(userId, date),
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

const { createActivityEntry, deleteActivityEntry, updateActivityEntry } = await import("./activity-actions");

const USER = { id: "user-a", email: null };
const t = activityStrings;

const running: CatalogActivity = { id: 8, name: "Running, 10 km/h", met: 9.3, category: "running" };

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
  revalidatePath.mockReset();
  getCurrentUser.mockReset().mockResolvedValue(USER);
  getActivity.mockReset().mockResolvedValue(running);
  getLatestWeight.mockReset().mockResolvedValue({ kg: 70, date: "2026-10-10" });
});

describe("createActivityEntry", () => {
  const fields = { date: "2026-10-14", activityId: "8", minutes: "30" };

  it("looks up the activity and the weight at the same time", async () => {
    let resolveActivity: (value: typeof running) => void = () => {};
    getActivity.mockReturnValue(new Promise((resolve) => (resolveActivity = resolve)));

    const pending = createActivityEntry(initialActivityFormState, form(fields));
    await vi.waitFor(() => expect(getLatestWeight).toHaveBeenCalledWith(USER.id, "2026-10-14"));
    resolveActivity(running);

    expect((await pending).status).toBe("saved");
  });

  it("snapshots kcal computed on the server from MET, the latest weight and the duration", async () => {
    // A forged kcal or user_id in the form is ignored.
    const state = await createActivityEntry(
      initialActivityFormState,
      form({ ...fields, kcal: "1", user_id: "user-b", label: "Forged" }),
    );

    expect(state).toEqual({ status: "saved", fieldErrors: {}, formError: null, needsWeight: false, values: {} });
    expect(getActivity).toHaveBeenCalledWith(8);
    // Weight on or before the entry's date.
    expect(getLatestWeight).toHaveBeenCalledWith(USER.id, "2026-10-14");
    expect(calls).toEqual([
      {
        table: "activity_entries",
        op: "insert",
        filters: [],
        payload: {
          user_id: USER.id,
          entry_date: "2026-10-14",
          activity_id: 8,
          label: "Running, 10 km/h",
          minutes: 30,
          // (9.3 - 1) x 70 kg x 0.5 h = 290.5 -> 291.
          kcal: 291,
        },
      },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/today");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("requires a session", async () => {
    getCurrentUser.mockResolvedValue(null);
    const state = await createActivityEntry(initialActivityFormState, form(fields));
    expect(state).toMatchObject({ status: "error", formError: t.errors.unauthorized });
    expect(calls).toHaveLength(0);
  });

  it("returns field errors for an invalid duration without touching the database", async () => {
    const state = await createActivityEntry(initialActivityFormState, form({ ...fields, minutes: "0" }));
    expect(state).toEqual({
      status: "error",
      fieldErrors: { minutes: t.validation.minutesRange(1440) },
      formError: t.validation.fix,
      needsWeight: false,
      values: { minutes: "0" },
    });
    expect(getActivity).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it("rejects a tampered date", async () => {
    const state = await createActivityEntry(initialActivityFormState, form({ ...fields, date: "tomorrow" }));
    expect(state).toMatchObject({ status: "error", formError: t.errors.unexpected });
    expect(calls).toHaveLength(0);
  });

  it("fails when the activity is not visible to the caller", async () => {
    getActivity.mockResolvedValue(null);
    const state = await createActivityEntry(initialActivityFormState, form(fields));
    expect(state).toMatchObject({ status: "error", formError: t.errors.activityMissing });
    expect(calls).toHaveLength(0);
  });

  it("blocks adding when no weight is logged on or before the date", async () => {
    getLatestWeight.mockResolvedValue(null);
    const state = await createActivityEntry(initialActivityFormState, form(fields));
    expect(state).toEqual({
      status: "error",
      fieldErrors: {},
      formError: t.errors.noWeight,
      needsWeight: true,
      values: { minutes: "30" },
    });
    expect(calls).toHaveLength(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a snapshot the kcal column cannot hold", async () => {
    getActivity.mockResolvedValue({ ...running, met: 30 });
    getLatestWeight.mockResolvedValue({ kg: 400, date: "2026-10-10" });
    const state = await createActivityEntry(initialActivityFormState, form({ ...fields, minutes: "1440" }));
    expect(state).toMatchObject({ status: "error", fieldErrors: { minutes: t.validation.kcalTooLarge } });
    expect(calls).toHaveLength(0);
  });

  it("reports a database error without revalidating", async () => {
    nextResult = { data: null, error: { code: "42501", message: "rls" } };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const state = await createActivityEntry(initialActivityFormState, form(fields));
    expect(state).toMatchObject({ status: "error", formError: t.errors.saveFailed });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reports a full day when the row quota rejects the insert", async () => {
    nextResult = {
      data: null,
      error: { code: "23514", message: "row_quota:activity_entries: at most 100 rows per user_id, entry_date" },
    };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const state = await createActivityEntry(initialActivityFormState, form(fields));
    expect(state).toMatchObject({ status: "error", formError: t.errors.dayFull });
    expect(consoleError).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateActivityEntry", () => {
  const stored = { id: 42, entry_date: "2026-10-12", activity_id: 8 };

  it("recomputes kcal from the stored entry's activity and date, scoped to the caller", async () => {
    results.push({ data: stored, error: null }, { data: { id: 42 }, error: null });
    getLatestWeight.mockResolvedValue({ kg: 80, date: "2026-10-01" });

    // A forged date in the form is ignored: the entry's own date picks the weight.
    const state = await updateActivityEntry(
      initialActivityFormState,
      form({ entryId: "42", minutes: "60", date: "2026-10-15", kcal: "1" }),
    );

    expect(state.status).toBe("saved");
    expect(getLatestWeight).toHaveBeenCalledWith(USER.id, "2026-10-12");
    expect(calls).toEqual([
      {
        table: "activity_entries",
        op: "select",
        filters: [
          ["id", 42],
          ["user_id", USER.id],
        ],
      },
      {
        table: "activity_entries",
        op: "update",
        // (9.3 - 1) x 80 kg x 1 h = 664.
        payload: { minutes: 60, kcal: 664 },
        filters: [
          ["id", 42],
          ["user_id", USER.id],
        ],
      },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/today");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("validates the duration before reading anything", async () => {
    const state = await updateActivityEntry(initialActivityFormState, form({ entryId: "42", minutes: "1.5" }));
    expect(state).toMatchObject({ status: "error", fieldErrors: { minutes: t.validation.wholeMinutes } });
    expect(calls).toHaveLength(0);
  });

  it("fails when the entry is not the caller's", async () => {
    results.push({ data: null, error: null });
    const state = await updateActivityEntry(initialActivityFormState, form({ entryId: "42", minutes: "60" }));
    expect(state).toMatchObject({ status: "error", formError: t.errors.entryMissing });
    expect(calls).toHaveLength(1);
  });

  it("cannot recompute an entry whose activity was deleted", async () => {
    results.push({ data: { ...stored, activity_id: null }, error: null });
    const state = await updateActivityEntry(initialActivityFormState, form({ entryId: "42", minutes: "60" }));
    expect(state).toMatchObject({ status: "error", formError: t.errors.activityMissing });
    expect(calls).toHaveLength(1);
  });

  it("blocks the change when no weight is logged on or before the entry date", async () => {
    results.push({ data: stored, error: null });
    getLatestWeight.mockResolvedValue(null);
    const state = await updateActivityEntry(initialActivityFormState, form({ entryId: "42", minutes: "60" }));
    expect(state).toMatchObject({ status: "error", formError: t.errors.noWeight, needsWeight: true });
    expect(calls).toHaveLength(1);
  });
});

describe("deleteActivityEntry", () => {
  it("deletes only the caller's entry and refreshes Today", async () => {
    nextResult = { data: [{ id: 42 }], error: null };
    expect(await deleteActivityEntry(42)).toEqual({ ok: true, data: undefined });
    expect(calls).toEqual([
      {
        table: "activity_entries",
        op: "delete",
        filters: [
          ["id", 42],
          ["user_id", USER.id],
        ],
      },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/today");
  });

  it("reports an entry that no longer exists", async () => {
    nextResult = { data: [], error: null };
    expect(await deleteActivityEntry(42)).toEqual({ ok: false, error: t.errors.entryMissing });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects an invalid id without touching the database", async () => {
    expect(await deleteActivityEntry(-1)).toEqual({ ok: false, error: t.errors.deleteFailed });
    expect(calls).toHaveLength(0);
  });

  it("requires a session", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect(await deleteActivityEntry(42)).toEqual({ ok: false, error: t.errors.unauthorized });
    expect(calls).toHaveLength(0);
  });
});
