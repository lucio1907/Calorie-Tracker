#!/usr/bin/env node
/**
 * Builds supabase/data/usda.csv from the curated selection
 * (supabase/data/usda-selection.csv) and the USDA FoodData Central SR Legacy
 * CSV download. The committed usda.csv is what imports use; re-run this after
 * changing the selection.
 *
 * Input: the unzipped SR Legacy download,
 *   https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
 * (the directory holding food.csv and food_nutrient.csv).
 *
 * Usage: node scripts/extract-usda.mjs <sr-legacy-dir> [selection.csv] [output.csv]
 *
 * It fails, writing nothing, when the selection is invalid or names an FDC id
 * that is missing or whose USDA description differs from the one written in
 * the selection (a mistyped id). Foods without an energy value, and foods
 * whose energy contradicts their macros, are skipped and listed. Nothing is
 * estimated or corrected.
 */
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { ARGENFOODS_COLUMNS } from "./lib/argenfoods.mjs";
import { formatCsv, parseCsv } from "./lib/csv.mjs";
import { buildUsdaRow, USDA_NUTRIENTS, validateUsdaSelection } from "./lib/usda.mjs";

const [srDir, selectionArg, outputArg] = process.argv.slice(2);
if (!srDir) {
  console.error("usage: node scripts/extract-usda.mjs <sr-legacy-dir> [selection.csv] [output.csv]");
  process.exit(1);
}

/** @param {string} message */
function fail(message) {
  console.error(`extract-usda: ${message}`);
  process.exit(1);
}

const selectionFile = resolve(selectionArg ?? "supabase/data/usda-selection.csv");
const output = resolve(outputArg ?? "supabase/data/usda.csv");

const { entries, errors } = validateUsdaSelection(parseCsv(readFileSync(selectionFile, "utf8")));
if (errors.length > 0) fail(`invalid selection ${selectionFile}:\n  ${errors.join("\n  ")}`);
const wanted = new Set(entries.map((entry) => entry.fdcId));
const nutrientIds = new Set(Object.values(USDA_NUTRIENTS));

/** @type {Map<string, { description: string, nutrients: Map<string, number> }>} */
const foods = new Map();
const [foodHeader, ...foodRows] = parseCsv(readFileSync(join(srDir, "food.csv"), "utf8"));
if (foodHeader.slice(0, 3).join(",") !== "fdc_id,data_type,description") fail("unexpected food.csv header");
for (const [fdcId, , description] of foodRows) {
  if (wanted.has(fdcId)) foods.set(fdcId, { description, nutrients: new Map() });
}

// food_nutrient.csv has ~650k lines: read it line by line, parsing only the
// lines of selected foods ("id","fdc_id","nutrient_id","amount",...).
const lines = createInterface({ input: createReadStream(join(srDir, "food_nutrient.csv"), "utf8"), crlfDelay: Infinity });
let header = true;
for await (const line of lines) {
  if (header) {
    if (!line.startsWith('"id","fdc_id","nutrient_id","amount"')) fail("unexpected food_nutrient.csv header");
    header = false;
    continue;
  }
  const fdcId = line.split(",", 2)[1]?.replaceAll('"', "");
  const food = fdcId ? foods.get(fdcId) : undefined;
  if (!food) continue;
  const [, , nutrientId, amount] = parseCsv(line)[0];
  if (nutrientIds.has(nutrientId) && amount !== "") food.nutrients.set(nutrientId, Number(amount));
}

const rows = [];
const skipped = [];
const problems = [];
for (const entry of entries) {
  try {
    const result = buildUsdaRow(entry, foods.get(entry.fdcId));
    if ("row" in result) rows.push(result.row);
    else skipped.push(`#${entry.fdcId} ${entry.name}: ${result.skipped}`);
  } catch (error) {
    problems.push(/** @type {Error} */ (error).message);
  }
}
if (problems.length > 0) fail(`selection does not match SR Legacy:\n  ${problems.join("\n  ")}`);

writeFileSync(output, formatCsv([ARGENFOODS_COLUMNS, ...rows.map((row) => ARGENFOODS_COLUMNS.map((c) => row[c]))]));

console.log(`Wrote ${rows.length} of ${entries.length} foods to ${output}. Skipped ${skipped.length}:`);
skipped.forEach((line) => console.log(`  - ${line}`));
