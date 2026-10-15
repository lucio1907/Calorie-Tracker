import { assertNonNegative, InvalidArgumentError } from "./calculators/assert";
import { MEALS, type Meal } from "./meal";

/** Energy and macros. Per 100 g on a food, absolute on a diary entry. */
export type Nutrients = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const ZERO_NUTRIENTS: Readonly<Nutrients> = Object.freeze({ kcal: 0, protein: 0, carbs: 0, fat: 0 });

/**
 * Upper bound for one diary entry. Keeps snapshots inside the database
 * columns (kcal numeric(7,2): 900 kcal/100 g x 5000 g = 45000).
 */
export const MAX_ENTRY_GRAMS = 5000;

const NUTRIENT_KEYS = ["kcal", "protein", "carbs", "fat"] as const;

/** Integer hundredths: the database stores every value with 2 decimals. */
function toHundredths(value: number): number {
  return Math.round(value * 100);
}

/**
 * Nutrients eaten for `grams` of a food, from its per-100 g values.
 *
 * Rounding rules:
 * - Inputs are taken at database precision (2 decimals) and converted to
 *   integer hundredths, so the multiplication is exact (no 0.30000000000000004).
 * - Each result is rounded half up to 2 decimals, the scale of the
 *   food_entries columns, so the stored snapshot equals this value.
 * - Display rounding (whole kcal, 1-decimal grams) happens only in the UI;
 *   totals are summed from the stored 2-decimal snapshots (see sumNutrients).
 *
 * @throws InvalidArgumentError When grams is not in (0, MAX_ENTRY_GRAMS] or a nutrient is negative.
 */
export function nutrientSnapshot(per100g: Nutrients, grams: number): Nutrients {
  if (!Number.isFinite(grams) || grams <= 0 || grams > MAX_ENTRY_GRAMS) {
    throw new InvalidArgumentError(`Grams must be greater than 0 and at most ${MAX_ENTRY_GRAMS}, got ${grams}.`);
  }
  const gramsHundredths = toHundredths(grams);

  const snapshot = { ...ZERO_NUTRIENTS };
  for (const key of NUTRIENT_KEYS) {
    assertNonNegative(per100g[key], key);
    // (per100 * 100) * (grams * 100) / 10000 = value * 100, i.e. hundredths of the result.
    snapshot[key] = Math.round((toHundredths(per100g[key]) * gramsHundredths) / 10_000) / 100;
  }
  return snapshot;
}

/** Sum of snapshots, added in integer hundredths so totals never drift. */
export function sumNutrients(items: readonly Nutrients[]): Nutrients {
  const hundredths = { ...ZERO_NUTRIENTS };
  for (const item of items) {
    for (const key of NUTRIENT_KEYS) hundredths[key] += toHundredths(item[key]);
  }
  const total = { ...ZERO_NUTRIENTS };
  for (const key of NUTRIENT_KEYS) total[key] = hundredths[key] / 100;
  return total;
}

/** Totals per meal slot; meals without entries total zero. */
export function mealTotals(entries: ReadonlyArray<Nutrients & { meal: Meal }>): Record<Meal, Nutrients> {
  return Object.fromEntries(
    MEALS.map((meal) => [meal, sumNutrients(entries.filter((entry) => entry.meal === meal))]),
  ) as Record<Meal, Nutrients>;
}

/** Totals for a whole day. */
export function dayTotals(entries: readonly Nutrients[]): Nutrients {
  return sumNutrients(entries);
}
