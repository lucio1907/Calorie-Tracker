"use client";

import { useCallback, useEffect, useState } from "react";
import type { FoodDetail } from "../lib/types";

export type FoodDetailStatus = "loading" | "ready" | "not_found" | "error";

type Loaded = { key: string; food: FoodDetail | null; status: Exclude<FoodDetailStatus, "loading"> };

/** Loads one food (with portions) from /api/foods/:id; `reload` refetches after a mutation. */
export function useFoodDetail(foodId: number) {
  const [reloadCount, setReloadCount] = useState(0);
  const key = `${foodId}|${reloadCount}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/foods/${foodId}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (response.status === 404) return setLoaded({ key, food: null, status: "not_found" });
        if (!response.ok) throw new Error(`detail failed: ${response.status}`);
        const body: { food: FoodDetail } = await response.json();
        setLoaded({ key, food: body.food, status: "ready" });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded((previous) => ({ key, food: previous?.food ?? null, status: "error" }));
      });
    return () => controller.abort();
  }, [foodId, key]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  /** Applies a confirmed change locally (e.g. favorite flag) without a refetch. */
  const patch = useCallback(
    (changes: Partial<FoodDetail>) =>
      setLoaded((previous) => (previous?.food ? { ...previous, food: { ...previous.food, ...changes } } : previous)),
    [],
  );

  // Keep showing the previous food while a reload is in flight.
  const sameFood = loaded?.food?.id === foodId;
  const food = sameFood ? (loaded?.food ?? null) : null;
  const status: FoodDetailStatus =
    loaded === null || (loaded.key !== key && !sameFood) ? "loading" : loaded.key !== key ? "ready" : loaded.status;

  return { food, status, reload, patch, reloading: loaded !== null && loaded.key !== key };
}
