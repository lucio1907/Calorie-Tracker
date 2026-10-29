import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getCurrentUser = vi.fn();
vi.mock("@/features/auth/data/current-user", () => ({ getCurrentUser: () => getCurrentUser() }));

const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));

const { GET } = await import("./route");

function row(id: number) {
  return {
    id,
    name: `Food ${id}`,
    brand: null,
    source: "argenfoods",
    food_group: "Cereales y derivados",
    barcode: null,
    kcal_per_100g: 100,
    protein_per_100g: 1,
    carbs_per_100g: 2,
    fat_per_100g: 3,
    is_own: false,
    is_favorite: false,
  };
}

function rows(count: number) {
  return Array.from({ length: count }, (_, index) => row(index + 1));
}

function search(params: Record<string, string>): Promise<Response> {
  const url = new URL("http://localhost/api/foods/search");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return GET({ nextUrl: url } as NextRequest);
}

beforeEach(() => {
  getCurrentUser.mockReset().mockResolvedValue({ id: "user-a", email: null });
  rpc.mockReset().mockResolvedValue({ data: [], error: null });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/foods/search", () => {
  // result_offset is only sent past the first page, so the first page and the
  // unpaged search keep working against the 3-argument search_foods (a
  // database the pagination migration has not reached yet).
  it("without a page returns up to 30 foods and no paging info, as before", async () => {
    rpc.mockResolvedValue({ data: rows(30), error: null });

    const response = await search({ q: "arroz" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("search_foods", {
      search_query: "arroz",
      favorites_only: false,
      result_limit: 30,
    });
    expect(body.foods).toHaveLength(30);
    expect(body).not.toHaveProperty("hasNextPage");
  });

  it("returns 7 foods per page and says when another page follows", async () => {
    rpc.mockResolvedValue({ data: rows(8), error: null });

    const response = await search({ q: "", page: "1" });
    const body = await response.json();

    expect(rpc).toHaveBeenCalledWith("search_foods", {
      search_query: "",
      favorites_only: false,
      result_limit: 8,
    });
    expect(body.foods.map((food: { id: number }) => food.id)).toEqual(rows(7).map((food) => food.id));
    expect(body.hasNextPage).toBe(true);
  });

  it("skips the earlier pages and reports the last one", async () => {
    rpc.mockResolvedValue({ data: rows(5), error: null });

    const response = await search({ q: "pan", favorites: "1", page: "3" });
    const body = await response.json();

    expect(rpc).toHaveBeenCalledWith("search_foods", {
      search_query: "pan",
      favorites_only: true,
      result_limit: 8,
      result_offset: 14,
    });
    expect(body).toMatchObject({ hasNextPage: false });
    expect(body.foods).toHaveLength(5);
  });

  it.each(["0", "-1", "abc", "1.5", "", "501"])("rejects page=%j without searching", async (page) => {
    const response = await search({ q: "pan", page });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid page" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("answers 401 to signed-out callers", async () => {
    getCurrentUser.mockResolvedValue(null);
    const response = await search({ q: "pan", page: "1" });
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
});
