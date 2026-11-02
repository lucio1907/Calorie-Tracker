/**
 * Shared body of the catalog import scripts (import-argenfoods, import-usda):
 * validates a catalog CSV (columns of argenfoods.csv) and upserts it into
 * public.foods as shared rows of one source. Idempotent: rows are matched on
 * (source, external_code), so re-running updates values instead of
 * duplicating foods. Foods removed from the CSV are not deleted (diary
 * entries and recipes may reference them).
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
import { validateArgenfoodsRows } from "./argenfoods.mjs";
import { parseCsv } from "./csv.mjs";
import { remoteWriteRefusal } from "./operator.mjs";

const BATCH_SIZE = 200;

/**
 * @param {object} options
 * @param {string} options.script Name used as the error prefix (e.g. "import-argenfoods").
 * @param {string} options.label Source name for messages (e.g. "ARGENFOODS").
 * @param {string} options.source Value of public.foods.source.
 * @param {string} options.defaultFile CSV path when --file is not given.
 * @param {(row: import("./argenfoods.mjs").ArgenfoodsRow) => Record<string, unknown>} options.toRecord
 */
export async function runCatalogImport({ script, label, source, defaultFile, toRecord }) {
  /** @param {string} message */
  function fail(message) {
    console.error(`${script}: ${message}`);
    process.exit(1);
  }

  const { values } = parseArgs({
    options: {
      file: { type: "string", default: defaultFile },
      "dry-run": { type: "boolean", default: false },
      yes: { type: "boolean", default: false },
    },
  });

  const file = resolve(/** @type {string} */ (values.file));
  const { rows, errors } = validateArgenfoodsRows(parseCsv(readFileSync(file, "utf8")));
  if (errors.length > 0) fail(`invalid CSV ${file}:\n  ${errors.join("\n  ")}`);
  if (rows.length === 0) fail(`no rows in ${file}`);

  if (values["dry-run"]) {
    console.log(`Dry run: ${rows.length} valid rows in ${file}.`);
    process.exit(0);
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) return fail("set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL).");
  if (!serviceRoleKey) return fail("set SUPABASE_SERVICE_ROLE_KEY.");

  console.log(`Target: ${new URL(url).host}`);
  const refusal = remoteWriteRefusal(url, Boolean(values.yes));
  if (refusal) fail(refusal);

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const records = rows.map(toRecord);
  for (let start = 0; start < records.length; start += BATCH_SIZE) {
    const batch = records.slice(start, start + BATCH_SIZE);
    const { error } = await supabase.from("foods").upsert(batch, { onConflict: "source,external_code" });
    if (error) fail(`batch starting at row ${start + 1}: ${error.message}`);
  }

  const { count, error: countError } = await supabase
    .from("foods")
    .select("id", { count: "exact", head: true })
    .eq("source", source)
    .is("owner_id", null);
  if (countError) fail(countError.message);

  console.log(`Upserted ${records.length} ${label} foods. Shared ${label} rows in the database: ${count}.`);
}
