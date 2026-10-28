import { nutrientSnapshot, type Nutrients } from "@/domain";
import { toDecimal } from "@/features/foods/lib/food-schema";
import { parseUnit, resolveEntryAmount, toUnitGrams, type EntryUnit, type PortionOption } from "./entry-amount";

export type EntryPreview = { grams: number; nutrients: Nutrients };

type PreviewFood = Nutrients & { portions: readonly PortionOption[] };

/**
 * What the entry will log, computed exactly like the server does
 * (same rounding), or null while the input is incomplete or invalid.
 * `food` nutrients are per 100 g; `unitGramsText` is the typed weight of a unit being defined.
 */
export function previewEntry(
  food: PreviewFood,
  unitValue: string,
  amountText: string,
  unitGramsText = "",
): EntryPreview | null {
  const choice = parseUnit(unitValue);
  const amount = toDecimal(amountText);
  if (!choice || typeof amount !== "number") return null;

  let unit: EntryUnit;
  if (choice.kind === "newUnit") {
    const unitGrams = toDecimal(unitGramsText);
    const grams = typeof unitGrams === "number" ? toUnitGrams(unitGrams) : null;
    if (grams === null) return null;
    unit = { kind: "newUnit", grams };
  } else {
    unit = choice;
  }

  const resolved = resolveEntryAmount(unit, amount, food.portions);
  if (!resolved.ok) return null;
  return { grams: resolved.value.grams, nutrients: nutrientSnapshot(food, resolved.value.grams) };
}
