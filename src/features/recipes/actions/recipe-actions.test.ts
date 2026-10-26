import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialRecipeFormState } from "../lib/types";
import { recipesStrings } from "../strings";

vi.mock("server-only", () => ({}));

const refresh = vi.fn();
vi.mock("next/cache", () => ({ refresh: () => refresh() }));

const getCurrentUser = vi.fn();
vi.mock("@/features/auth/data/current-user", () => ({ getCurrentUser: () => getCurrentUser() }));

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
    in: (column: string, value: unknown) => (call.filters.push([column, value]), chain),
    single: settle,
    maybeSingle: settle,
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => settle().then(resolve, reject),
  };
  return chain;
}

const rpcCalls: Array<{ fn: string; args: unknown }> = [];
let rpcResult: { data: unknown; error: unknown } = { data: 9, error: null };
function rpc(fn: string, args: unknown) {
  rpcCalls.push({ fn, args });
  return Promise.resolve(rpcResult);
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: builder, rpc }) }));

const { createRecipe, deleteRecipe, updateRecipe } = await import("./recipe-actions");

const USER = { id: "user-a", email: null };
const t = recipesStrings;
const ok = { data: null, error: null };

/** Recipe form fields; each ingredient is [foodId, grams]. */
function form(fields: Record<string, string>, items: Array<[string, string]> = []): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  for (const [foodId, grams] of items) {
    data.append("foodId", foodId);
    data.append("grams", grams);
  }
  return data;
}

const fields = { name: " Rice and chicken ", servings: "2", notes: "" };

beforeEach(() => {
  calls.length = 0;
  results.length = 0;
  nextResult = ok;
  rpcCalls.length = 0;
  rpcResult = { data: 9, error: null };
  refresh.mockReset();
  getCurrentUser.mockReset().mockResolvedValue(USER);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const rlsError = (table: string) => ({
  code: "42501",
  message: `new row violates row-level security policy for table "${table}"`,
});

describe("createRecipe", () => {
  it("saves the recipe and its ingredients in one call, in form order, without any nutrients", async () => {
    const state = await createRecipe(
      initialRecipeFormState,
      form({ ...fields, kcal: "1", user_id: "user-b" }, [["7", "300"], ["8", "200,5"]]),
    );

    expect(state.status).toBe("saved");
    expect(rpcCalls).toEqual([
      {
        fn: "save_recipe",
        args: {
          recipe_id: undefined,
          name: "Rice and chicken",
          servings: 2,
          notes: undefined,
          ingredients: [
            { food_id: 7, grams: 300 },
            { food_id: 8, grams: 200.5 },
          ],
        },
      },
    ]);
    expect(calls).toHaveLength(0);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("allows a recipe without ingredients and keeps notes", async () => {
    expect((await createRecipe(initialRecipeFormState, form({ ...fields, notes: " Slow cook " }))).status).toBe("saved");
    expect(rpcCalls[0].args).toMatchObject({ notes: "Slow cook", ingredients: [] });
  });

  it("requires a session", async () => {
    getCurrentUser.mockResolvedValue(null);
    const state = await createRecipe(initialRecipeFormState, form(fields));
    expect(state).toMatchObject({ status: "error", formError: t.errors.unauthorized });
    expect(rpcCalls).toHaveLength(0);
  });

  it.each([
    [{ name: "" }, { name: t.validation.required }],
    [{ servings: "0" }, { servings: t.validation.servingsRange(999) }],
    [{ servings: "0.004" }, { servings: t.validation.servingsRange(999) }],
    [{ servings: "1000" }, { servings: t.validation.servingsRange(999) }],
    [{ servings: "two" }, { servings: t.validation.number }],
    [{ notes: "x".repeat(2001) }, { notes: t.validation.notesLength }],
  ])("rejects %o without touching the database", async (override, fieldErrors) => {
    const state = await createRecipe(initialRecipeFormState, form({ ...fields, ...override }));
    expect(state).toMatchObject({ status: "error", fieldErrors, formError: t.validation.fix });
    expect(rpcCalls).toHaveLength(0);
  });

  it("flags ingredient grams by row", async () => {
    const state = await createRecipe(initialRecipeFormState, form(fields, [["7", "100"], ["8", "0"], ["9", "10001"]]));
    expect(state).toMatchObject({
      status: "error",
      itemErrors: { 1: t.validation.gramsRange(10000), 2: t.validation.gramsRange(10000) },
    });
    expect(rpcCalls).toHaveLength(0);
  });

  it("rejects more ingredients than the quota allows", async () => {
    const many = Array.from({ length: 101 }, (): [string, string] => ["7", "10"]);
    const state = await createRecipe(initialRecipeFormState, form(fields, many));
    expect(state).toMatchObject({ status: "error", fieldErrors: { items: t.validation.tooManyItems(100) } });
    expect(rpcCalls).toHaveLength(0);
  });

  it("treats a tampered food id as unexpected", async () => {
    const state = await createRecipe(initialRecipeFormState, form(fields, [["abc", "100"]]));
    expect(state).toMatchObject({ status: "error", formError: t.errors.unexpected });
    expect(rpcCalls).toHaveLength(0);
  });

  it("maps the recipes row quota to a clear message", async () => {
    rpcResult = { data: null, error: { code: "23514", message: "row_quota:recipes: at most 500 rows per user_id" } };
    const state = await createRecipe(initialRecipeFormState, form(fields));
    expect(state).toMatchObject({ status: "error", formError: t.errors.limitReached });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("maps the ingredients row quota to the ingredient limit", async () => {
    rpcResult = { data: null, error: { code: "23514", message: "row_quota:recipe_items: at most 100 rows per recipe_id" } };
    const state = await createRecipe(initialRecipeFormState, form(fields, [["7", "100"]]));
    expect(state).toMatchObject({ status: "error", formError: t.validation.tooManyItems(100) });
  });

  it("reports an ingredient whose food the caller cannot see", async () => {
    rpcResult = { data: null, error: rlsError("recipe_items") };
    const state = await createRecipe(initialRecipeFormState, form(fields, [["999", "100"]]));
    expect(state).toMatchObject({ status: "error", formError: t.errors.foodMissing });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reports other failures generically", async () => {
    rpcResult = { data: null, error: rlsError("recipes") };
    const state = await createRecipe(initialRecipeFormState, form(fields));
    expect(state).toMatchObject({ status: "error", formError: t.errors.saveFailed });
  });
});

describe("updateRecipe", () => {
  it("saves the fields and the full ingredient list for that recipe", async () => {
    const state = await updateRecipe(initialRecipeFormState, form({ ...fields, recipeId: "9" }, [["8", "75"]]));
    expect(state.status).toBe("saved");
    expect(rpcCalls).toEqual([
      {
        fn: "save_recipe",
        args: {
          recipe_id: 9,
          name: "Rice and chicken",
          servings: 2,
          notes: undefined,
          ingredients: [{ food_id: 8, grams: 75 }],
        },
      },
    ]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("reports someone else's (or a deleted) recipe as missing", async () => {
    rpcResult = { data: null, error: { code: "P0002", message: "recipe 9 not found" } };
    const state = await updateRecipe(initialRecipeFormState, form({ ...fields, recipeId: "9" }));
    expect(state).toMatchObject({ status: "error", formError: t.errors.recipeMissing });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("requires a valid recipe id", async () => {
    const state = await updateRecipe(initialRecipeFormState, form({ ...fields, recipeId: "x" }));
    expect(state).toMatchObject({ status: "error", formError: t.errors.unexpected });
    expect(rpcCalls).toHaveLength(0);
  });

  it("requires a session", async () => {
    getCurrentUser.mockResolvedValue(null);
    const state = await updateRecipe(initialRecipeFormState, form({ ...fields, recipeId: "9" }));
    expect(state).toMatchObject({ status: "error", formError: t.errors.unauthorized });
    expect(rpcCalls).toHaveLength(0);
  });
});

describe("deleteRecipe", () => {
  it("deletes only the caller's recipe", async () => {
    nextResult = { data: [{ id: 9 }], error: null };
    expect(await deleteRecipe(9)).toEqual({ ok: true, data: undefined });
    expect(calls).toEqual([{ table: "recipes", op: "delete", filters: [["id", 9], ["user_id", USER.id]] }]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("reports a recipe that is not the caller's", async () => {
    nextResult = { data: [], error: null };
    expect(await deleteRecipe(9)).toEqual({ ok: false, error: t.errors.recipeMissing });
  });

  it("rejects a malformed id", async () => {
    expect(await deleteRecipe(-1)).toEqual({ ok: false, error: t.delete.failed });
    expect(calls).toHaveLength(0);
  });
});
