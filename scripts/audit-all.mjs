#!/usr/bin/env node
/**
 * Full `npm audit`, dev dependencies included, failing on high and critical
 * advisories that have no current waiver.
 *
 * CI's blocking audit only checks production dependencies (what ships to
 * users). This one also watches the dev toolchain, which runs on developer
 * machines and in CI. An advisory with no fixed release can be waived below
 * with a reason and a review date; past that date it fails again, so every
 * waiver gets looked at instead of lingering forever.
 *
 * Usage:
 *   npm run audit:all
 */
import { spawnSync } from "node:child_process";
import { applyWaivers } from "./lib/audit.mjs";

/** @type {import("./lib/audit.mjs").Waiver[]} */
const WAIVERS = [];

function fail(message) {
  console.error(`audit-all: ${message}`);
  process.exit(1);
}

const audit = spawnSync("npm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (audit.error) fail(audit.error.message);

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  fail(`npm audit did not return JSON (exit ${audit.status}).\n${audit.stderr}`);
}
// npm audit exits non-zero whenever it finds anything; only a report error is fatal here.
if (report.error) fail(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`);

const today = new Date().toISOString().slice(0, 10);
const { unwaived, expired, waived, unused } = applyWaivers(report, WAIVERS, today);

const describe = (advisory) => `${advisory.id} (${advisory.severity}) ${advisory.title} [${advisory.packages.join(", ")}] ${advisory.url}`;

for (const advisory of waived) console.log(`waived: ${describe(advisory)}`);
for (const waiver of unused) console.log(`unused waiver, remove it: ${waiver.id}`);
for (const advisory of expired) {
  console.error(`waiver expired on ${advisory.waiver.reviewBy}, review it: ${describe(advisory)}`);
}
for (const advisory of unwaived) console.error(`not waived: ${describe(advisory)}`);

if (unwaived.length > 0 || expired.length > 0) process.exit(1);
console.log("audit-all: no unwaived high or critical advisories.");
