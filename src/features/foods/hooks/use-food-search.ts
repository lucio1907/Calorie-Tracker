"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FoodSummary } from "../lib/types";
import { useDebouncedValue } from "./use-debounced-value";

export const SEARCH_DEBOUNCE_MS = 250;

export type FoodSearchStatus = "idle" | "loading" | "error";

/** Paged search: `page` is 1-based; `initialHasNextPage` goes with the server-rendered first page. */
export type FoodSearchPaging = { page: number; initialHasNextPage: boolean };

type Results = { foods: FoodSummary[]; page: number; hasNextPage: boolean };

type Loaded = Results & { key: string; failed: boolean };

async function requestFoods(
  query: string,
  favoritesOnly: boolean,
  page: number | undefined,
  signal: AbortSignal,
): Promise<Results> {
  const params = new URLSearchParams({ q: query });
  if (favoritesOnly) params.set("favorites", "1");
  if (page !== undefined) params.set("page", String(page));
  const response = await fetch(`/api/foods/search?${params}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`search failed: ${response.status}`);
  const body: { foods: FoodSummary[]; hasNextPage?: boolean } = await response.json();
  return { foods: body.foods, page: page ?? 1, hasNextPage: body.hasNextPage ?? false };
}

/**
 * Debounced search-as-you-type against /api/foods/search. Superseded requests
 * are aborted; the previous results stay visible (dimmed) while loading.
 * `initialFoods` are the server-rendered results for an empty query.
 * With `paging`, results come one page at a time; the returned `page` and
 * `hasNextPage` describe the results on screen, not the one being loaded.
 */
export function useFoodSearch(
  query: string,
  favoritesOnly: boolean,
  initialFoods: FoodSummary[],
  paging?: FoodSearchPaging,
) {
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const [reloadCount, setReloadCount] = useState(0);
  const page = paging?.page;
  const key = `${favoritesOnly ? 1 : 0}|${reloadCount}|${page ?? ""}|${debouncedQuery}`;

  const [loaded, setLoaded] = useState<Loaded>(() => ({
    key,
    foods: initialFoods,
    page: page ?? 1,
    hasNextPage: paging?.initialHasNextPage ?? false,
    failed: false,
  }));
  // Last key whose results are on screen; set only after a request completes,
  // so an aborted request (e.g. React Strict Mode's double effect) is retried.
  const shownKey = useRef(key);

  useEffect(() => {
    if (shownKey.current === key) return;
    const controller = new AbortController();
    requestFoods(debouncedQuery, favoritesOnly, page, controller.signal)
      .then((results) => {
        shownKey.current = key;
        setLoaded({ ...results, key, failed: false });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        shownKey.current = key;
        setLoaded((previous) => ({ ...previous, key, failed: true }));
      });
    return () => controller.abort();
  }, [key, debouncedQuery, favoritesOnly, page]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  const pending = loaded.key !== key || debouncedQuery !== query.trim();
  const status: FoodSearchStatus = pending ? "loading" : loaded.failed ? "error" : "idle";

  return { foods: loaded.foods, page: loaded.page, hasNextPage: loaded.hasNextPage, status, reload };
}
