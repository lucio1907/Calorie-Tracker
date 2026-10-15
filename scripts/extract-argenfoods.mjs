#!/usr/bin/env node
/**
 * One-off extraction of the ARGENFOODS composition table into
 * supabase/data/argenfoods.csv. The committed CSV is what imports use; re-run
 * this only when ARGENFOODS publishes new data.
 *
 * Inputs (download once, politely, from https://www.argenfood.unlu.edu.ar/):
 *   1. <sheets-dir>: the group spreadsheets /Tablas/Grupo/<Group>.xls for the
 *      stems in ARGENFOODS_GROUPS (scripts/lib/argenfoods.mjs), converted to
 *      UTF-8 CSV, e.g. with LibreOffice:
 *        soffice --headless --convert-to \
 *          'csv:Text - txt - csv (StarCalc):44,34,76,1,,0,false,true,false,false,false,-1' \
 *          --outdir <sheets-dir> <Group>.xls          # writes <Group>-Hoja1.csv
 *      They provide each food's code, name and group.
 *   2. <pages-dir>: one page per food, /Tablas/Codigo/<code>.htm, saved as
 *      <pages-dir>/<code>.htm (windows-1252, as served). They provide the
 *      nutrient values, read by label. Spreadsheet values are not used because
 *      some sheets have data columns shifted against their header.
 *
 * Usage: node scripts/extract-argenfoods.mjs <sheets-dir> <pages-dir> [output.csv]
 *
 * Foods without an energy value, and foods whose declared energy contradicts
 * their macros (see energyMismatch), are skipped and listed. Nothing is
 * estimated or corrected.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  ARGENFOODS_COLUMNS,
  ARGENFOODS_GROUPS,
  buildArgenfoodsRow,
  energyMismatch,
  listSheetFoods,
  parseFoodPage,
} from "./lib/argenfoods.mjs";
import { formatCsv, parseCsv } from "./lib/csv.mjs";

const [sheetsDir, pagesDir, outputArg] = process.argv.slice(2);
if (!sheetsDir || !pagesDir) {
  console.error("usage: node scripts/extract-argenfoods.mjs <sheets-dir> <pages-dir> [output.csv]");
  process.exit(1);
}

const output = resolve(outputArg ?? "supabase/data/argenfoods.csv");
const sheetFiles = readdirSync(sheetsDir);
const decoder = new TextDecoder("windows-1252");

/** @type {Map<string, { code: string, name: string, group: string }>} */
const catalog = new Map();
for (const [stem, group] of Object.entries(ARGENFOODS_GROUPS)) {
  const file = sheetFiles.find((name) => name.startsWith(`${stem}-`) && name.endsWith(".csv"));
  if (!file) {
    console.error(`extract-argenfoods: missing sheet for ${stem}`);
    process.exit(1);
  }
  for (const food of listSheetFoods(parseCsv(readFileSync(join(sheetsDir, file), "utf8")), group)) {
    if (catalog.has(food.code)) {
      console.error(`extract-argenfoods: code ${food.code} appears in more than one sheet`);
      process.exit(1);
    }
    catalog.set(food.code, food);
  }
}

const rows = [];
const skipped = [];
for (const food of [...catalog.values()].sort((a, b) => Number(a.code) - Number(b.code))) {
  const label = `#${food.code} ${food.name} (${food.group})`;
  const html = decoder.decode(readFileSync(join(pagesDir, `${food.code}.htm`)));
  const row = buildArgenfoodsRow(food, parseFoodPage(html));
  if (!row) {
    skipped.push(`${label}: no energy value`);
    continue;
  }
  const mismatch = energyMismatch(row);
  if (mismatch) {
    skipped.push(`${label}: ${mismatch}`);
    continue;
  }
  rows.push(row);
}

writeFileSync(output, formatCsv([ARGENFOODS_COLUMNS, ...rows.map((row) => ARGENFOODS_COLUMNS.map((c) => row[c]))]));

console.log(`Wrote ${rows.length} of ${catalog.size} foods to ${output}. Skipped ${skipped.length}:`);
skipped.forEach((line) => console.log(`  - ${line}`));
