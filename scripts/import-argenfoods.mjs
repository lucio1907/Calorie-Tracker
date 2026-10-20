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
 * Before writing, it prints the target host. Anything but the local stack
 * (127.0.0.1 / localhost) needs --yes, so a hosted project is never written
 * to by accident (e.g. a production key left in .env.local).
 *
 * Environment (shell or .env.local), server-side only:
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   bypasses RLS to write shared rows; never expose it
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { toFoodRecord, validateArgenfoodsRows } from "./lib/argenfoods.mjs";
import { parseCsv } from "./lib/csv.mjs";
import { remoteWriteRefusal } from "./lib/operator.mjs";

const BATCH_SIZE = 200;

function fail(message) {
  console.error(`import-argenfoods: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    file: { type: "string", default: "supabase/data/argenfoods.csv" },
    "dry-run": { type: "boolean", default: false },
    yes: { type: "boolean", default: false },
  },
});

const file = resolve(values.file);
const { rows, errors } = validateArgenfoodsRows(parseCsv(readFileSync(file, "utf8")));
if (errors.length > 0) fail(`invalid CSV ${file}:\n  ${errors.join("\n  ")}`);
if (rows.length === 0) fail(`no rows in ${file}`);

if (values["dry-run"]) {
  console.log(`Dry run: ${rows.length} valid rows in ${file}.`);
  process.exit(0);
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url) fail("set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL).");
if (!serviceRoleKey) fail("set SUPABASE_SERVICE_ROLE_KEY.");

console.log(`Target: ${new URL(url).host}`);
const refusal = remoteWriteRefusal(url, values.yes);
if (refusal) fail(refusal);

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const records = rows.map(toFoodRecord);
for (let start = 0; start < records.length; start += BATCH_SIZE) {
  const batch = records.slice(start, start + BATCH_SIZE);
  const { error } = await supabase.from("foods").upsert(batch, { onConflict: "source,external_code" });
  if (error) fail(`batch starting at row ${start + 1}: ${error.message}`);
}

const { count, error: countError } = await supabase
  .from("foods")
  .select("id", { count: "exact", head: true })
  .eq("source", "argenfoods")
  .is("owner_id", null);
if (countError) fail(countError.message);

console.log(`Upserted ${records.length} ARGENFOODS foods. Shared ARGENFOODS rows in the database: ${count}.`);
