import { nutrientSnapshot, type Nutrients } from "@/domain";
import { toDecimal } from "@/features/foods/lib/food-schema";
import { parseUnit, resolveEntryAmount, type PortionOption } from "./entry-amount";

export type EntryPreview = { grams: number; nutrients: Nutrients };

type PreviewFood = Nutrients & { portions: readonly PortionOption[] };

/**
 * What the entry will log, computed exactly like the server does
 * (same rounding), or null while the input is incomplete or invalid.
 * `food` nutrients are per 100 g.
 */
export function previewEntry(food: PreviewFood, unitValue: string, amountText: string): EntryPreview | null {
  const unit = parseUnit(unitValue);
  const amount = toDecimal(amountText);
  if (!unit || typeof amount !== "number") return null;

  const resolved = resolveEntryAmount(unit, amount, food.portions);
  if (!resolved.ok) return null;
  return { grams: resolved.value.grams, nutrients: nutrientSnapshot(food, resolved.value.grams) };
}
