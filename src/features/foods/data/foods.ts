import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { isFoodSource, type FoodDetail, type FoodSource, type FoodSummary } from "../lib/types";

/*
 * Server-only reads for the foods feature. Every query runs with the caller's
 * session through the publishable key, so RLS decides what is visible
 * (own foods + the shared catalog). No service key here.
 */

type SearchRow = Database["public"]["Functions"]["search_foods"]["Returns"][number];

function toSource(value: string): FoodSource {
  if (!isFoodSource(value)) throw new Error(`Unknown food source: ${value}`);
  return value;
}

function toSummary(row: SearchRow): FoodSummary {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    source: toSource(row.source),
    group: row.food_group,
    kcal: Number(row.kcal_per_100g),
    protein: Number(row.protein_per_100g),
    carbs: Number(row.carbs_per_100g),
    fat: Number(row.fat_per_100g),
    isOwn: row.is_own,
    isFavorite: row.is_favorite,
  };
}

export type SearchFoodsOptions = { query: string; favoritesOnly: boolean; limit?: number };

/** Trigram name search over own + shared foods (public.search_foods, SECURITY INVOKER). */
export async function searchFoods({ query, favoritesOnly, limit = 30 }: SearchFoodsOptions): Promise<FoodSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_foods", {
    search_query: query,
    favorites_only: favoritesOnly,
    result_limit: limit,
  });
  if (error) throw new Error(`search_foods failed: ${error.message}`);
  return data.map(toSummary);
}

/** The caller's most recently logged distinct foods (public.recent_foods, SECURITY INVOKER). */
export async function getRecentFoods(limit = 10): Promise<FoodSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("recent_foods", { result_limit: limit });
  if (error) throw new Error(`recent_foods failed: ${error.message}`);
  return data.map(toSummary);
}

const DETAIL_COLUMNS =
  "id, owner_id, source, name, brand, barcode, external_code, food_group, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_mg_per_100g, food_portions (id, label, grams)";

/** One visible food with its portions and the caller's favorite flag, or null. */
export async function getFoodDetail(foodId: number, userId: string): Promise<FoodDetail | null> {
  const supabase = await createClient();
  const [foodResult, favoriteResult] = await Promise.all([
    supabase.from("foods").select(DETAIL_COLUMNS).eq("id", foodId).maybeSingle(),
    supabase.from("food_favorites").select("food_id").eq("food_id", foodId).eq("user_id", userId).maybeSingle(),
  ]);
  if (foodResult.error) throw new Error(`food ${foodId}: ${foodResult.error.message}`);
  if (favoriteResult.error) throw new Error(`favorite ${foodId}: ${favoriteResult.error.message}`);

  const row = foodResult.data;
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    source: toSource(row.source),
    group: row.food_group,
    kcal: Number(row.kcal_per_100g),
    protein: Number(row.protein_per_100g),
    carbs: Number(row.carbs_per_100g),
    fat: Number(row.fat_per_100g),
    fiber: row.fiber_per_100g === null ? null : Number(row.fiber_per_100g),
    sodiumMg: row.sodium_mg_per_100g === null ? null : Number(row.sodium_mg_per_100g),
    barcode: row.barcode,
    externalCode: row.external_code,
    isOwn: row.owner_id === userId,
    isFavorite: favoriteResult.data !== null,
    portions: row.food_portions
      .map((portion) => ({ id: portion.id, label: portion.label, grams: Number(portion.grams) }))
      .sort((a, b) => a.grams - b.grams || a.label.localeCompare(b.label, "es-AR")),
  };
}

/**
 * Finds a visible food by barcode, preferring the caller's own row over the
 * shared catalog. Returns its id or null.
 */
export async function findFoodIdByBarcode(barcodes: string[]): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .select("id, owner_id")
    .in("barcode", barcodes)
    .order("owner_id", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`barcode lookup failed: ${error.message}`);
  return data?.id ?? null;
}
