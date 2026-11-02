/**
 * USDA FoodData Central helpers shared by the extract and import scripts.
 *
 * Source: U.S. Department of Agriculture, Agricultural Research Service.
 * FoodData Central, SR Legacy (April 2018), https://fdc.nal.usda.gov/
 * (download: /fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip).
 * FoodData Central data is in the public domain (CC0 1.0); USDA asks to be
 * cited as the source, which the app does on every USDA food.
 *
 * supabase/data/usda.csv uses the same columns, limits and validation as
 * argenfoods.csv. Differences in the values themselves:
 *   - carbs: always "Carbohydrate, by difference" (fiber included);
 *   - names and groups are ours (Spanish), chosen in
 *     supabase/data/usda-selection.csv next to the USDA description.
 */

import { energyMismatch, toFoodRecord } from "./argenfoods.mjs";

export const USDA_ATTRIBUTION =
  "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central (SR Legacy), public domain. https://fdc.nal.usda.gov/";

/** Columns of supabase/data/usda-selection.csv, in order. */
export const USDA_SELECTION_COLUMNS = ["fdc_id", "name", "group", "usda_description"];

/** Catalog column -> FDC nutrient id (nutrient.csv). All per 100 g; sodium in mg. */
export const USDA_NUTRIENTS = {
  kcal: "1008",
  protein: "1003",
  carbs: "1005",
  fat: "1004",
  fiber: "1079",
  sodium_mg: "1093",
};

/** Control (Cc) and invisible format (Cf: zero-width, bidi overrides) characters. */
const CONTROL_OR_FORMAT = /[\p{Cc}\p{Cf}]/u;

/**
 * @typedef {object} UsdaSelectionEntry
 * @property {string} fdcId
 * @property {string} name
 * @property {string} group
 * @property {string} usdaDescription
 */

/**
 * Validates parsed rows of supabase/data/usda-selection.csv.
 * @param {string[][]} rows Rows including the header.
 * @returns {{ entries: UsdaSelectionEntry[], errors: string[] }}
 */
export function validateUsdaSelection(rows) {
  const [header, ...body] = rows;
  if (!header || header.join(",") !== USDA_SELECTION_COLUMNS.join(",")) {
    return { entries: [], errors: [`header must be: ${USDA_SELECTION_COLUMNS.join(",")}`] };
  }

  /** @type {UsdaSelectionEntry[]} */
  const entries = [];
  const errors = [];
  const seenIds = new Set();
  const seenNames = new Set();

  body.forEach((cells, index) => {
    const line = index + 2;
    if (cells.length === 1 && cells[0] === "") return;
    if (cells.length !== USDA_SELECTION_COLUMNS.length) {
      errors.push(`line ${line}: expected ${USDA_SELECTION_COLUMNS.length} columns, got ${cells.length}`);
      return;
    }

    const [fdcId, name, group, usdaDescription] = cells.map((cell) => cell.trim());
    const rowErrors = [];
    if (!/^\d{1,10}$/.test(fdcId)) rowErrors.push("fdc_id must be digits");
    else if (seenIds.has(fdcId)) rowErrors.push(`duplicate fdc_id ${fdcId}`);
    if (name.length < 1 || name.length > 200) rowErrors.push("name must be 1-200 characters");
    else if (seenNames.has(name.toLowerCase())) rowErrors.push(`duplicate name "${name}"`);
    if (group.length < 1 || group.length > 100) rowErrors.push("group must be 1-100 characters");
    if (usdaDescription.length < 1) rowErrors.push("usda_description is required");
    if (CONTROL_OR_FORMAT.test(name) || CONTROL_OR_FORMAT.test(group)) rowErrors.push("control or format characters");

    if (rowErrors.length > 0) {
      errors.push(`line ${line}: ${rowErrors.join("; ")}`);
      return;
    }
    seenIds.add(fdcId);
    seenNames.add(name.toLowerCase());
    entries.push({ fdcId, name, group, usdaDescription });
  });

  return { entries, errors };
}

/**
 * Builds the catalog row of one selected food from its SR Legacy data.
 * Throws when the selection is wrong (unknown id, or an id whose USDA
 * description differs from the one written next to it: a mistyped id).
 * Returns { skipped } for foods the catalog must not hold; nothing is
 * estimated or corrected.
 *
 * @param {UsdaSelectionEntry} entry
 * @param {{ description: string, nutrients: Map<string, number> } | undefined} food
 * @returns {{ row: import("./argenfoods.mjs").ArgenfoodsRow } | { skipped: string }}
 */
export function buildUsdaRow(entry, food) {
  if (!food) throw new Error(`fdc_id ${entry.fdcId} is not in the SR Legacy download`);
  if (food.description !== entry.usdaDescription) {
    throw new Error(`fdc_id ${entry.fdcId} is "${food.description}", not "${entry.usdaDescription}"`);
  }

  /** @param {keyof typeof USDA_NUTRIENTS} column */
  const value = (column) => food.nutrients.get(USDA_NUTRIENTS[column]) ?? null;
  const kcal = value("kcal");
  if (kcal === null) return { skipped: "no energy value" };

  const row = {
    code: entry.fdcId,
    name: entry.name,
    group: entry.group,
    kcal,
    protein: value("protein"),
    carbs: value("carbs"),
    fat: value("fat"),
    fiber: value("fiber"),
    sodium_mg: value("sodium_mg"),
  };
  const mismatch = energyMismatch(row);
  return mismatch ? { skipped: mismatch } : { row };
}

/**
 * Maps a usda.csv row to a public.foods row (shared, source 'usda').
 * @param {import("./argenfoods.mjs").ArgenfoodsRow} row
 */
export function toUsdaRecord(row) {
  return { ...toFoodRecord(row), source: "usda" };
}
