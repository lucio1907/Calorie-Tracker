import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialFoodFormState, initialPortionFormState } from "../lib/form-state";
import { foodsStrings } from "../strings";

vi.mock("server-only", () => ({}));

const getCurrentUser = vi.fn();
vi.mock("@/features/auth/data/current-user", () => ({ getCurrentUser: () => getCurrentUser() }));

/** Minimal chainable stand-in for the supabase-js query builder: every call resolves `nextResult`. */
let nextResult: { data: unknown; error: unknown } = { data: null, error: null };

function builder() {
  const settle = () => Promise.resolve(nextResult);
  const chain = {
    select: () => chain,
    insert: () => chain,
    single: settle,
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => settle().then(resolve, reject),
  };
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: builder }) }));

const { createFood, setFavorite } = await import("./food-actions");
const { addPortion } = await import("./portion-actions");

const t = foodsStrings;
const granola = { name: "Granola", kcal: "450", protein: "10", carbs: "60", fat: "15" };

/** What the row_quotas migration raises once an owner holds the maximum rows. */
function quotaError(table: string) {
  return { data: null, error: { code: "23514", message: `row_quota:${table}: at most 1 rows per owner_id` } };
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  nextResult = { data: null, error: null };
  getCurrentUser.mockReset().mockResolvedValue({ id: "user-a", email: null });
});

describe("row quota errors", () => {
  it("createFood reports the food limit", async () => {
    nextResult = quotaError("foods");
    const state = await createFood(initialFoodFormState, form(granola));
    expect(state).toMatchObject({ status: "error", formError: t.form.limitReached, values: { name: "Granola" } });
  });

  it("createFood keeps the generic error for other check violations", async () => {
    nextResult = { data: null, error: { code: "23514", message: "check violation" } };
    const state = await createFood(initialFoodFormState, form(granola));
    expect(state).toMatchObject({ status: "error", formError: t.form.failed });
  });

  it("addPortion reports the portion limit", async () => {
    nextResult = quotaError("food_portions");
    const state = await addPortion(initialPortionFormState, form({ foodId: "7", label: "Cup", grams: "40" }));
    expect(state).toMatchObject({ status: "error", formError: t.portions.limitReached, values: { label: "Cup" } });
  });

  it("setFavorite reports the favorite limit", async () => {
    nextResult = quotaError("food_favorites");
    await expect(setFavorite(7, true)).resolves.toEqual({ ok: false, error: t.detail.favoriteLimit });
  });
});
