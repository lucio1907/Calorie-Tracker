export const FOOD_SOURCES = ["argenfoods", "off", "custom"] as const;

export type FoodSource = (typeof FOOD_SOURCES)[number];

export function isFoodSource(value: unknown): value is FoodSource {
  return typeof value === "string" && (FOOD_SOURCES as readonly string[]).includes(value);
}

/** Row in search results. Nutrients are per 100 g. */
export type FoodSummary = {
  id: number;
  name: string;
  brand: string | null;
  source: FoodSource;
  group: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  isOwn: boolean;
  isFavorite: boolean;
};

export type FoodPortion = {
  id: number;
  label: string;
  grams: number;
};

/** Full food for the detail panel and the edit form. */
export type FoodDetail = FoodSummary & {
  barcode: string | null;
  externalCode: string | null;
  fiber: number | null;
  sodiumMg: number | null;
  portions: FoodPortion[];
};

/** Values a user (or an Open Food Facts product) provides for a food. */
export type FoodValues = {
  name: string;
  brand: string | null;
  barcode: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sodiumMg: number | null;
};

/** An Open Food Facts search hit, shown but not persisted until selected. */
export type OffSearchHit = {
  barcode: string;
  name: string;
  brand: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** Result of a mutation, shaped for the UI (never raw database rows). */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
