import { MAX_ENTRY_GRAMS } from "@/domain";
import type { EntryAmount } from "./types";

/** Value of the "grams" option in the unit picker; any other value is a portion id. */
export const GRAMS_UNIT = "g";

/** Upper bound for the portion count (food_entries.quantity check constraint). */
export const MAX_PORTION_QUANTITY = 1000;

export type EntryUnit = { kind: "grams" } | { kind: "portion"; portionId: number };

export type PortionOption = { id: number; label: string; grams: number };

export type AmountError = "invalid_amount" | "portion_missing" | "too_large" | "too_small";

export type ResolveAmountResult = { ok: true; value: EntryAmount } | { ok: false; error: AmountError };

const PORTION_ID = /^[1-9]\d{0,15}$/;

/** Reads the unit picker value: "g" or a positive portion id. Null for anything else. */
export function parseUnit(value: unknown): EntryUnit | null {
  if (value === GRAMS_UNIT) return { kind: "grams" };
  if (typeof value !== "string" || !PORTION_ID.test(value)) return null;
  const portionId = Number(value);
  return Number.isSafeInteger(portionId) ? { kind: "portion", portionId } : null;
}

/** Integer hundredths: the database stores grams and quantities with 2 decimals. */
function toHundredths(value: number): number {
  return Math.round(value * 100);
}

/**
 * Turns "amount of unit" into the grams to log.
 * - grams: the amount is the grams.
 * - portion: quantity x portion grams, computed in integer hundredths and
 *   rounded half up to 2 decimals (the scale of food_entries.grams).
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
  const portion = portions.find((candidate) => candidate.id === unit.portionId);
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
