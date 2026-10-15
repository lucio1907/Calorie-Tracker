"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FoodSummary } from "../lib/types";
import { useDebouncedValue } from "./use-debounced-value";

export const SEARCH_DEBOUNCE_MS = 250;

export type FoodSearchStatus = "idle" | "loading" | "error";

type Loaded = { key: string; foods: FoodSummary[]; failed: boolean };

async function requestFoods(query: string, favoritesOnly: boolean, signal: AbortSignal): Promise<FoodSummary[]> {
  const params = new URLSearchParams({ q: query });
  if (favoritesOnly) params.set("favorites", "1");
  const response = await fetch(`/api/foods/search?${params}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`search failed: ${response.status}`);
  const body: { foods: FoodSummary[] } = await response.json();
  return body.foods;
}

/**
 * Debounced search-as-you-type against /api/foods/search. Superseded requests
 * are aborted; the previous results stay visible (dimmed) while loading.
 * `initialFoods` are the server-rendered results for an empty query.
 */
export function useFoodSearch(query: string, favoritesOnly: boolean, initialFoods: FoodSummary[]) {
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const [reloadCount, setReloadCount] = useState(0);
  const key = `${favoritesOnly ? 1 : 0}|${reloadCount}|${debouncedQuery}`;

  const [loaded, setLoaded] = useState<Loaded>(() => ({ key, foods: initialFoods, failed: false }));
  // Last key whose results are on screen; set only after a request completes,
  // so an aborted request (e.g. React Strict Mode's double effect) is retried.
  const shownKey = useRef(key);

  useEffect(() => {
    if (shownKey.current === key) return;
    const controller = new AbortController();
    requestFoods(debouncedQuery, favoritesOnly, controller.signal)
      .then((foods) => {
        shownKey.current = key;
        setLoaded({ key, foods, failed: false });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        shownKey.current = key;
        setLoaded((previous) => ({ key, foods: previous.foods, failed: true }));
      });
    return () => controller.abort();
  }, [key, debouncedQuery, favoritesOnly]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  const pending = loaded.key !== key || debouncedQuery !== query.trim();
  const status: FoodSearchStatus = pending ? "loading" : loaded.failed ? "error" : "idle";

  return { foods: loaded.foods, status, reload };
}
