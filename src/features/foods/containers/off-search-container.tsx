"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { importOffProduct } from "../actions/off-actions";
import { OffSearchPanel, type OffSearchStatus } from "../components/off-search-panel";
import { offQuerySchema } from "../lib/food-schema";
import type { OffSearchHit } from "../lib/types";
import { foodsStrings } from "../strings";

const t = foodsStrings.off;

type OffSearchContainerProps = {
  initialQuery: string;
  onImported: (foodId: number) => void;
};

type SearchState = { status: OffSearchStatus; results: OffSearchHit[]; error: string | null };

/** Searches Open Food Facts through /api/off/search and imports the picked product. */
export function OffSearchContainer({ initialQuery, onImported }: OffSearchContainerProps) {
  const startsSearching = offQuerySchema.safeParse(initialQuery).success;
  const [search, setSearch] = useState<SearchState>({
    status: startsSearching ? "loading" : "idle",
    results: [],
    error: null,
  });
  const [addingBarcode, setAddingBarcode] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [, startImport] = useTransition();
  const controllerRef = useRef<AbortController | null>(null);

  const request = useCallback((query: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    fetch(`/api/off/search?${new URLSearchParams({ q: query })}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`OFF search failed: ${response.status}`);
        const body: { results: OffSearchHit[] } = await response.json();
        setSearch({ status: "done", results: body.results, error: null });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSearch({ status: "error", results: [], error: t.unavailable });
      });
  }, []);

  // Run the search the user asked for when the panel opened. The panel is
  // keyed by its query, so this effectively runs once per opening.
  useEffect(() => {
    if (startsSearching) request(initialQuery.trim());
    return () => controllerRef.current?.abort();
  }, [initialQuery, request, startsSearching]);

  function handleSearch(query: string) {
    const parsed = offQuerySchema.safeParse(query);
    if (!parsed.success) {
      setSearch({ status: "error", results: [], error: t.queryTooShort });
      return;
    }
    setSearch((previous) => ({ ...previous, status: "loading", error: null }));
    request(parsed.data);
  }

  function handleAdd(hit: OffSearchHit) {
    setAddingBarcode(hit.barcode);
    setAddError(null);
    startImport(async () => {
      const result = await importOffProduct(hit.barcode);
      setAddingBarcode(null);
      if (result.ok) onImported(result.data.foodId);
      else setAddError(result.error);
    });
  }

  return (
    <OffSearchPanel
      initialQuery={initialQuery}
      status={search.status}
      error={search.error}
      results={search.results}
      addingBarcode={addingBarcode}
      addError={addError}
      onSearch={handleSearch}
      onAdd={handleAdd}
    />
  );
}
