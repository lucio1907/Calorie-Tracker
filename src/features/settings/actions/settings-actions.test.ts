import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialProfileFormState, initialWeightFormState } from "../lib/types";
import { settingsStrings } from "../strings";

vi.mock("server-only", () => ({}));

const refresh = vi.fn();
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  refresh: () => refresh(),
  revalidatePath: (path: string) => revalidatePath(path),
}));

const getCurrentUser = vi.fn();
vi.mock("@/features/auth/data/current-user", () => ({ getCurrentUser: () => getCurrentUser() }));

/** Minimal stand-in for the supabase-js query builder: records upserts and resolves `nextResult`. */
type Call = { table: string; op: string; payload?: unknown; options?: unknown };
const calls: Call[] = [];
let nextResult: { data: unknown; error: unknown } = { data: null, error: null };

function builder(table: string) {
  const call: Call = { table, op: "select" };
  calls.push(call);
  const chain = {
    upsert: (payload: unknown, options: unknown) => (
      (call.op = "upsert"), (call.payload = payload), (call.options = options), chain
    ),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(nextResult).then(resolve, reject),
  };
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: builder }) }));

const { logWeight, saveProfile } = await import("./settings-actions");

const USER = { id: "user-a", email: null };
const t = settingsStrings;

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  calls.length = 0;
  nextResult = { data: null, error: null };
  refresh.mockReset();
  revalidatePath.mockReset();
  getCurrentUser.mockReset().mockResolvedValue(USER);
  // 22:30 on 15 Oct in Buenos Aires; already 16 Oct in UTC.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-16T01:30:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("saveProfile", () => {
  const fields = {
    sex: "male",
    birthDate: "1996-01-10",
    heightCm: "180",
    activityLevel: "moderate",
    goal: "lose",
    goalKgPerWeek: "0,5",
    proteinPct: "30",
    carbsPct: "40",
    fatPct: "30",
  };

  it("upserts the caller's profile row and refreshes Today and Settings", async () => {
    // A forged user_id in the form is ignored: the row is always the caller's.
    const state = await saveProfile(initialProfileFormState, form({ ...fields, user_id: "user-b" }));

    expect(state).toEqual({ status: "saved", fieldErrors: {}, formError: null });
    expect(calls).toEqual([
      {
        table: "profiles",
        op: "upsert",
        payload: {
          user_id: USER.id,
          sex: "male",
          birth_date: "1996-01-10",
          height_cm: 180,
          activity_level: "moderate",
          goal: "lose",
          goal_kg_per_week: 0.5,
          protein_pct: 30,
          carbs_pct: 40,
          fat_pct: 30,
        },
        options: { onConflict: "user_id" },
      },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/today");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("requires a session", async () => {
    getCurrentUser.mockResolvedValue(null);
    const state = await saveProfile(initialProfileFormState, form(fields));
    expect(state).toEqual({ status: "error", fieldErrors: {}, formError: t.errors.unauthorized });
    expect(calls).toHaveLength(0);
  });

  it("returns field errors without touching the database", async () => {
    const state = await saveProfile(initialProfileFormState, form({ ...fields, fatPct: "20" }));
    expect(state).toEqual({
      status: "error",
      fieldErrors: { macroSplit: t.validation.macroTotal(90) },
      formError: t.validation.fix,
    });
    expect(calls).toHaveLength(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("bounds the birth date with the Buenos Aires day, not the UTC day", async () => {
    // Local today is 2026-10-15, so a 2025-10-16 birth date is still under a year old.
    const state = await saveProfile(initialProfileFormState, form({ ...fields, birthDate: "2025-10-16" }));
    expect(state.fieldErrors).toEqual({ birthDate: t.validation.birthDateRange });
  });

  it("reports a database error without revalidating", async () => {
    nextResult = { data: null, error: { code: "23514", message: "check violation" } };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const state = await saveProfile(initialProfileFormState, form(fields));
    expect(state).toEqual({ status: "error", fieldErrors: {}, formError: t.errors.profileSaveFailed });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("logWeight", () => {
  it("upserts today's row (Buenos Aires day) so a second log the same day replaces it", async () => {
    const state = await logWeight(initialWeightFormState, form({ kg: "80,5", entry_date: "2020-01-01" }));

    expect(state).toEqual({ status: "saved", fieldError: null, formError: null, value: "" });
    expect(calls).toEqual([
      {
        table: "weight_entries",
        op: "upsert",
        payload: { user_id: USER.id, entry_date: "2026-10-15", kg: 80.5 },
        options: { onConflict: "user_id,entry_date" },
      },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/today");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("requires a session", async () => {
    getCurrentUser.mockResolvedValue(null);
    const state = await logWeight(initialWeightFormState, form({ kg: "80" }));
    expect(state).toEqual({ status: "error", fieldError: null, formError: t.errors.unauthorized, value: "80" });
    expect(calls).toHaveLength(0);
  });

  it("echoes an invalid weight with its error", async () => {
    const state = await logWeight(initialWeightFormState, form({ kg: "800" }));
    expect(state).toEqual({
      status: "error",
      fieldError: t.validation.weightRange(20, 400),
      formError: null,
      value: "800",
    });
    expect(calls).toHaveLength(0);
  });

  it("reports a database error without revalidating", async () => {
    nextResult = { data: null, error: { code: "42501", message: "rls" } };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const state = await logWeight(initialWeightFormState, form({ kg: "80" }));
    expect(state).toEqual({ status: "error", fieldError: null, formError: t.errors.weightSaveFailed, value: "80" });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
