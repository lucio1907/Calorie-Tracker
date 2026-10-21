"use server";

import { getCurrentUser } from "@/features/auth/data/current-user";
import { ensureOffFood } from "../data/off-foods";
import { OffRateLimitedError } from "../data/off-throttle";
import { OffUnavailableError } from "../data/open-food-facts";
import { barcodeSchema } from "../lib/food-schema";
import type { BarcodeLookupState } from "../lib/form-state";
import type { OffRejection } from "../lib/off-mapper";
import type { ActionResult } from "../lib/types";
import { foodsStrings as t } from "../strings";

/*
 * Barcode lookup and Open Food Facts import. Both take only a barcode from the
 * client; product values are always re-fetched from OFF on the server.
 */

const REJECTION_MESSAGES: Record<OffRejection, string> = {
  not_found: t.barcode.notFound,
  no_energy: t.barcode.noEnergy,
  invalid: t.barcode.invalidData,
};

async function resolveBarcode(barcode: string, userId: string): Promise<ActionResult<{ foodId: number }>> {
  try {
    const result = await ensureOffFood(barcode, userId);
    return result.ok ? { ok: true, data: { foodId: result.foodId } } : { ok: false, error: REJECTION_MESSAGES[result.reason] };
  } catch (error) {
    if (error instanceof OffUnavailableError) return { ok: false, error: t.barcode.unavailable };
    if (error instanceof OffRateLimitedError) return { ok: false, error: t.barcode.rateLimited };
    console.error("[foods] barcode lookup failed", error);
    return { ok: false, error: t.errors.unexpected };
  }
}

/** Form action: finds a stored food by barcode or imports it from OFF. */
export async function lookupBarcode(_previous: BarcodeLookupState, formData: FormData): Promise<BarcodeLookupState> {
  const raw = formData.get("barcode");
  const typed = typeof raw === "string" ? raw : "";

  const user = await getCurrentUser();
  if (!user) return { status: "error", foodId: null, error: t.errors.unauthorized, barcode: typed };

  const barcode = barcodeSchema.safeParse(typed);
  if (!barcode.success) return { status: "error", foodId: null, error: t.barcode.invalid, barcode: typed };

  const result = await resolveBarcode(barcode.data, user.id);
  return result.ok
    ? { status: "found", foodId: result.data.foodId, error: null, barcode: barcode.data }
    : { status: "error", foodId: null, error: result.error, barcode: typed };
}

/** Saves an OFF search result the user picked. */
export async function importOffProduct(barcode: string): Promise<ActionResult<{ foodId: number }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t.errors.unauthorized };

  const parsed = barcodeSchema.safeParse(barcode);
  if (!parsed.success) return { ok: false, error: t.barcode.invalid };

  return resolveBarcode(parsed.data, user.id);
}
