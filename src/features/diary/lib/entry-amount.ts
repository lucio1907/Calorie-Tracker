import { MAX_ENTRY_GRAMS } from "@/domain";
import { LIMITS } from "@/features/foods/lib/food-schema";
import { diaryStrings } from "../strings";
import type { EntryAmount } from "./types";

/** Value of the "grams" option in the unit picker; any other value but NEW_UNIT is a portion id. */
export const GRAMS_UNIT = "g";

/** Value of the "unidad" option of a food that has no unit yet: its weight is typed in the form. */
export const NEW_UNIT = "unit";

/** Label of the unit portion each user can define for a food ("unidad"). */
export const UNIT_LABEL = diaryStrings.units.unitLabel;

/** Upper bound for the portion count (food_entries.quantity check constraint). */
export const MAX_PORTION_QUANTITY = 1000;

/** A unit as picked in the form; "newUnit" carries the typed weight of one unit. */
export type EntryUnit = { kind: "grams" } | { kind: "portion"; portionId: number } | { kind: "newUnit"; grams: number };

/** The unit picker value alone (the weight of a new unit is a separate field). */
export type UnitChoice = { kind: "grams" } | { kind: "portion"; portionId: number } | { kind: "newUnit" };

export type PortionOption = { id: number; label: string; grams: number };

export type AmountError = "invalid_amount" | "portion_missing" | "too_large" | "too_small";

export type ResolveAmountResult = { ok: true; value: EntryAmount } | { ok: false; error: AmountError };

const PORTION_ID = /^[1-9]\d{0,15}$/;

/** Reads the unit picker value: "g", "unit" or a positive portion id. Null for anything else. */
export function parseUnit(value: unknown): UnitChoice | null {
  if (value === GRAMS_UNIT) return { kind: "grams" };
  if (value === NEW_UNIT) return { kind: "newUnit" };
  if (typeof value !== "string" || !PORTION_ID.test(value)) return null;
  const portionId = Number(value);
  return Number.isSafeInteger(portionId) ? { kind: "portion", portionId } : null;
}

/** The food's "unidad" portion (as the caller sees it), if it has one. */
export function findUnitPortion<T extends PortionOption>(portions: readonly T[]): T | undefined {
  return portions.find((portion) => portion.label.trim().toLocaleLowerCase("es-AR") === UNIT_LABEL);
}

/** Integer hundredths: the database stores grams and quantities with 2 decimals. */
function toHundredths(value: number): number {
  return Math.round(value * 100);
}

/** Typed weight of one unit, rounded to 2 decimals, or null outside a portion's bounds (0, 10000]. */
export function toUnitGrams(value: number): number | null {
  const grams = toHundredths(value) / 100;
  return grams > 0 && grams <= LIMITS.portionGrams.max ? grams : null;
}

/**
 * Turns "amount of unit" into the grams to log.
 * - grams: the amount is the grams.
 * - portion: quantity x portion grams, computed in integer hundredths and
 *   rounded half up to 2 decimals (the scale of food_entries.grams).
 * - newUnit: like a portion labeled "unidad" weighing the typed grams.
 * The result must stay in (0, MAX_ENTRY_GRAMS].
 */
export function resolveEntryAmount(
  unit: EntryUnit,
  amount: number,
  portions: readonly PortionOption[],
): ResolveAmountResult {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "invalid_amount" };

  if (unit.kind === "grams") {
    if (amount > MAX_ENTRY_GRAMS) return { ok: false, error: "too_large" };
    const grams = toHundredths(amount) / 100;
    if (grams <= 0) return { ok: false, error: "too_small" };
    return { ok: true, value: { grams, quantity: null, portionLabel: null } };
  }

  if (amount > MAX_PORTION_QUANTITY) return { ok: false, error: "invalid_amount" };
  const portion =
    unit.kind === "newUnit"
      ? { label: UNIT_LABEL, grams: unit.grams }
      : portions.find((candidate) => candidate.id === unit.portionId);
  if (!portion) return { ok: false, error: "portion_missing" };

  const quantityHundredths = toHundredths(amount);
  // quantity x grams, both in hundredths: the product is the result in ten-thousandths.
  const grams = Math.round((quantityHundredths * toHundredths(portion.grams)) / 100) / 100;
  if (quantityHundredths <= 0 || grams <= 0) return { ok: false, error: "too_small" };
  if (grams > MAX_ENTRY_GRAMS) return { ok: false, error: "too_large" };
  return { ok: true, value: { grams, quantity: quantityHundredths / 100, portionLabel: portion.label } };
}

/** True when an edit changes how much was logged (so the snapshot must be recomputed). */
export function amountChanged(logged: EntryAmount, next: EntryAmount): boolean {
  return logged.grams !== next.grams || logged.quantity !== next.quantity || logged.portionLabel !== next.portionLabel;
}
