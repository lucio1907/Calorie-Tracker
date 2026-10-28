import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FoodSummary } from "../lib/types";
import { SEARCH_DEBOUNCE_MS, useFoodSearch } from "./use-food-search";

function food(id: number, name: string): FoodSummary {
  return {
    id,
    name,
    brand: null,
    source: "argenfoods",
    group: "Cereales y derivados",
    kcal: 339,
    protein: 6.9,
    carbs: 77.5,
    fat: 0.2,
    isOwn: false,
    isFavorite: false,
  };
}

const fetchMock = vi.fn<typeof fetch>();

function respondWith(foods: FoodSummary[]) {
  return Promise.resolve(new Response(JSON.stringify({ foods }), { status: 200 }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("useFoodSearch", () => {
  it("shows the server-rendered results without fetching", () => {
    const initial = [food(1, "Arroz")];
    const { result } = renderHook(() => useFoodSearch("", false, initial));

    expect(result.current).toMatchObject({ foods: initial, status: "idle" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("debounces typing into a single request for the last query", async () => {
    fetchMock.mockImplementation(() => respondWith([food(2, "Avena")]));
    const { result, rerender } = renderHook(({ query }) => useFoodSearch(query, false, []), {
      initialProps: { query: "" },
    });

    rerender({ query: "a" });
    rerender({ query: "av" });
    rerender({ query: "ave" });
    expect(result.current.status).toBe("loading");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/foods/search?q=ave");
    expect(result.current).toMatchObject({ foods: [food(2, "Avena")], status: "idle" });
  });

  it("aborts a superseded request", async () => {
    const signals: AbortSignal[] = [];
    fetchMock.mockImplementation((_input, init) => {
      signals.push(init!.signal!);
      return new Promise(() => {});
    });
    const { rerender } = renderHook(({ query }) => useFoodSearch(query, false, []), { initialProps: { query: "" } });

    rerender({ query: "pan" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    });
    rerender({ query: "pan francés" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    });

    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it("asks for favorites only and reports errors while keeping the previous results", async () => {
    const initial = [food(1, "Arroz")];
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    const { result, rerender } = renderHook(({ favorites }) => useFoodSearch("", favorites, initial), {
      initialProps: { favorites: false },
    });

    rerender({ favorites: true });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/foods/search?q=&favorites=1");
    expect(result.current).toMatchObject({ foods: initial, status: "error" });
  });

  it("starts paged searches on the server-rendered first page", () => {
    const initial = [food(1, "Arroz")];
    const { result } = renderHook(() => useFoodSearch("", false, initial, { page: 1, initialHasNextPage: true }));

    expect(result.current).toMatchObject({ foods: initial, page: 1, hasNextPage: true, status: "idle" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks for the requested page and reports the page on screen", async () => {
    let answer: (response: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    const initial = [food(1, "Arroz")];
    const { result, rerender } = renderHook(
      ({ page }) => useFoodSearch("", false, initial, { page, initialHasNextPage: true }),
      { initialProps: { page: 1 } },
    );

    rerender({ page: 2 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    // The first page stays on screen (and keeps its paging info) until the second arrives.
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/foods/search?q=&page=2");
    expect(result.current).toMatchObject({ foods: initial, page: 1, hasNextPage: true, status: "loading" });

    await act(async () => {
      answer(new Response(JSON.stringify({ foods: [food(21, "Yerba")], hasNextPage: false }), { status: 200 }));
    });
    expect(result.current).toMatchObject({ foods: [food(21, "Yerba")], page: 2, hasNextPage: false, status: "idle" });
  });
});
