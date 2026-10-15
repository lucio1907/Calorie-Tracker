import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OffRejection } from "../lib/off-mapper";
import { findFoodIdByBarcode } from "./foods";
import { fetchOffProduct } from "./open-food-facts";

const UNIQUE_VIOLATION = "23505";

export type EnsureOffFoodResult = { ok: true; foodId: number } | { ok: false; reason: OffRejection };

/**
 * Returns the id of a visible food with this barcode, importing it from Open
 * Food Facts as the user's own food (source 'off') when it is not stored yet.
 * Values always come from OFF on the server, never from the client.
 * Throws OffUnavailableError when OFF cannot be reached.
 */
export async function ensureOffFood(barcode: string, userId: string): Promise<EnsureOffFoodResult> {
  const existing = await findFoodIdByBarcode([barcode]);
  if (existing !== null) return { ok: true, foodId: existing };

  const product = await fetchOffProduct(barcode);
  if (!product.ok) return product;

  const { food } = product;
  // OFF may canonicalize the code (e.g. UPC-A -> EAN-13): check that one too.
  if (food.barcode && food.barcode !== barcode) {
    const canonical = await findFoodIdByBarcode([food.barcode]);
    if (canonical !== null) return { ok: true, foodId: canonical };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .insert({
      owner_id: userId,
      source: "off",
      name: food.name,
      brand: food.brand,
      barcode: food.barcode,
      kcal_per_100g: food.kcal,
      protein_per_100g: food.protein,
      carbs_per_100g: food.carbs,
      fat_per_100g: food.fat,
      fiber_per_100g: food.fiber,
      sodium_mg_per_100g: food.sodiumMg,
    })
    .select("id")
    .single();

  if (error?.code === UNIQUE_VIOLATION) {
    // Saved concurrently (double tap): return the stored row.
    const stored = await findFoodIdByBarcode([food.barcode ?? barcode]);
    if (stored !== null) return { ok: true, foodId: stored };
  }
  if (error) throw new Error(`insert OFF food failed: ${error.message}`);
  return { ok: true, foodId: data.id };
}
