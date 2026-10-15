import { LIMITS } from "./food-schema";
import type { FoodValues, OffSearchHit } from "./types";

/**
 * Maps Open Food Facts payloads to this app's food values. OFF data is
 * crowd-sourced, so every value is type-checked and range-checked, and products
 * without energy are rejected instead of guessed.
 *
 * Field reference: https://openfoodfacts.github.io/openfoodfacts-server/api/ref-cheatsheet/
 * (nutriments are per 100 g as `<nutrient>_100g`; energy_100g is kJ, sodium_100g is g).
 */

const KJ_PER_KCAL = 4.184;
const BARCODE_PATTERN = /^\d{8,14}$/;
const MAX_NAME_LENGTH = 200;

export type OffRejection = "not_found" | "no_energy" | "invalid";

export type OffProductResult = { ok: true; food: FoodValues } | { ok: false; reason: OffRejection };

type Nutrients = Pick<FoodValues, "kcal" | "protein" | "carbs" | "fat" | "fiber" | "sodiumMg">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** OFF sends numbers, but older products sometimes carry numeric strings. */
function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && /^\s*-?\d+(\.\d+)?\s*$/.test(value)) return Number(value);
  return null;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed === "" ? null : collapsed;
}

/** First brand of a comma-separated string (product API) or an array (search API). */
function firstBrand(brands: unknown): string | null {
  const first = Array.isArray(brands) ? brands[0] : typeof brands === "string" ? brands.split(",")[0] : null;
  const brand = text(first);
  return brand ? brand.slice(0, MAX_NAME_LENGTH) : null;
}

function productName(product: Record<string, unknown>): string | null {
  const name = text(product.product_name_es) ?? text(product.product_name) ?? text(product.product_name_en);
  return name ? name.slice(0, MAX_NAME_LENGTH) : null;
}

/** kcal from energy-kcal_100g, else energy_100g (kJ) / 4.184. */
export function kcalPer100g(nutriments: Record<string, unknown>): number | null {
  const kcal = toNumber(nutriments["energy-kcal_100g"]);
  if (kcal !== null) return round(kcal);
  const kilojoules = toNumber(nutriments["energy_100g"]);
  return kilojoules === null ? null : round(kilojoules / KJ_PER_KCAL);
}

function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Reads per-100 g nutrients. Missing protein/carbs/fat count as 0 (OFF omits
 * them for e.g. water or soft drinks); fiber and sodium stay null when absent.
 */
export function readNutrients(nutriments: unknown): { ok: true; value: Nutrients } | { ok: false; reason: OffRejection } {
  if (!isRecord(nutriments)) return { ok: false, reason: "no_energy" };

  const kcal = kcalPer100g(nutriments);
  if (kcal === null) return { ok: false, reason: "no_energy" };

  const protein = toNumber(nutriments.proteins_100g) ?? 0;
  const carbs = toNumber(nutriments.carbohydrates_100g) ?? 0;
  const fat = toNumber(nutriments.fat_100g) ?? 0;
  const fiber = toNumber(nutriments.fiber_100g);
  const sodiumGrams = toNumber(nutriments.sodium_100g);
  const sodiumMg = sodiumGrams === null ? null : round(sodiumGrams * 1000);

  const macro = LIMITS.macro;
  const valid =
    inRange(kcal, LIMITS.kcal.min, LIMITS.kcal.max) &&
    [protein, carbs, fat].every((value) => inRange(value, macro.min, macro.max)) &&
    protein + carbs + fat <= 101 &&
    (fiber === null || inRange(fiber, macro.min, macro.max)) &&
    (sodiumMg === null || inRange(sodiumMg, LIMITS.sodiumMg.min, LIMITS.sodiumMg.max));
  if (!valid) return { ok: false, reason: "invalid" };

  return {
    ok: true,
    value: {
      kcal,
      protein: round(protein),
      carbs: round(carbs),
      fat: round(fat),
      fiber: fiber === null ? null : round(fiber),
      sodiumMg,
    },
  };
}

/**
 * Maps an OFF v2 product response (`GET /api/v2/product/{barcode}`).
 * `requestedBarcode` is used when OFF's own code is not a valid EAN/UPC.
 */
export function mapOffProduct(payload: unknown, requestedBarcode: string): OffProductResult {
  if (!isRecord(payload) || payload.status !== 1 || !isRecord(payload.product)) {
    return { ok: false, reason: "not_found" };
  }
  const product = payload.product;

  const nutrients = readNutrients(product.nutriments);
  if (!nutrients.ok) return nutrients;

  const code = typeof product.code === "string" && BARCODE_PATTERN.test(product.code) ? product.code : requestedBarcode;
  return {
    ok: true,
    food: {
      name: productName(product) ?? code,
      brand: firstBrand(product.brands),
      barcode: code,
      ...nutrients.value,
    },
  };
}

/** Maps one Search-a-licious hit. Hits without a barcode, name or energy are dropped. */
export function mapOffSearchHit(hit: unknown): OffSearchHit | null {
  if (!isRecord(hit) || typeof hit.code !== "string" || !BARCODE_PATTERN.test(hit.code)) return null;
  const name = productName(hit);
  if (!name) return null;

  const nutrients = readNutrients(hit.nutriments);
  if (!nutrients.ok) return null;

  const { kcal, protein, carbs, fat } = nutrients.value;
  return { barcode: hit.code, name, brand: firstBrand(hit.brands), kcal, protein, carbs, fat };
}

/** Lucene syntax characters the user should not be able to inject into the search query. */
const LUCENE_SPECIAL = /[+\-&|!(){}[\]^"~*?:\\/]/g;

/**
 * Builds a Search-a-licious query: the user's words as plain full-text terms
 * (Lucene operators stripped, lower-cased so AND/OR/NOT are not operators)
 * plus a filter on products sold in Argentina.
 */
export function buildOffSearchQuery(input: string): string {
  const terms = input.replace(LUCENE_SPECIAL, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return `${terms} countries_tags:"en:argentina"`;
}
