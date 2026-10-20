import type { CatalogActivity } from "./types";

/** Lowercase without accents, so "Natacion" finds "Natación". */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Catalog rows whose name contains every word of `query` (any order, case
 * and accent insensitive). An empty query returns the whole catalog.
 */
export function filterActivities(catalog: readonly CatalogActivity[], query: string): CatalogActivity[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...catalog];
  return catalog.filter((activity) => {
    const name = normalize(activity.name);
    return words.every((word) => name.includes(word));
  });
}
