#!/usr/bin/env node
/**
 * Upserts supabase/data/usda.csv into public.foods as shared catalog rows
 * (owner_id null, source 'usda', external_code = FDC id). Idempotent; never
 * deletes. Same CSV format as argenfoods.csv; see scripts/extract-usda.mjs
 * for how the file is produced and scripts/lib/usda.mjs for the source terms.
 *
 * Usage:
 *   npm run foods:import-usda [-- --file path/to.csv] [-- --dry-run] [-- --yes]
 *
 * Target host, --yes and environment: see scripts/lib/catalog-import.mjs.
 */
import { runCatalogImport } from "./lib/catalog-import.mjs";
import { toUsdaRecord } from "./lib/usda.mjs";

await runCatalogImport({
  script: "import-usda",
  label: "USDA",
  source: "usda",
  defaultFile: "supabase/data/usda.csv",
  toRecord: toUsdaRecord,
});
