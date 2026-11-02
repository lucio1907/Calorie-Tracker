#!/usr/bin/env node
/**
 * Upserts supabase/data/argenfoods.csv into public.foods as shared catalog rows
 * (owner_id null, source 'argenfoods'). Idempotent: rows are matched on
 * (source, external_code), so re-running updates values instead of
 * duplicating foods. Foods removed from the CSV are not deleted (diary entries
 * and recipes may reference them).
 *
 * CSV format (UTF-8, comma separated, header required):
 *   code,name,group,kcal,protein,carbs,fat,fiber,sodium_mg
 *   - code: ARGENFOODS food number (digits, unique)
 *   - name, group: as published by ARGENFOODS (Spanish)
 *   - kcal, protein, carbs, fat, fiber (g), sodium_mg (mg): per 100 g of edible
 *     portion; empty = not reported. kcal is required.
 *   - carbs: available carbohydrates when reported, otherwise total by difference.
 *   See scripts/extract-argenfoods.mjs for how the file was produced.
 *
 * Data: ARGENFOODS, Tabla de Composición de Alimentos, Universidad Nacional de
 * Luján, https://www.argenfood.unlu.edu.ar/ — non-commercial use with
 * attribution (see scripts/lib/argenfoods.mjs for the terms).
 *
 * Usage:
 *   npm run foods:import-argenfoods [-- --file path/to.csv] [-- --dry-run] [-- --yes]
 *
 * Target host, --yes and environment: see scripts/lib/catalog-import.mjs.
 */
import { toFoodRecord } from "./lib/argenfoods.mjs";
import { runCatalogImport } from "./lib/catalog-import.mjs";

await runCatalogImport({
  script: "import-argenfoods",
  label: "ARGENFOODS",
  source: "argenfoods",
  defaultFile: "supabase/data/argenfoods.csv",
  toRecord: toFoodRecord,
});
