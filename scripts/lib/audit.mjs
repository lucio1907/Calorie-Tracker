/**
 * Helpers for scripts/audit-all.mjs: reads an `npm audit --json` report
 * (npm 7+ format) and applies dated waivers.
 */

const FAILING_SEVERITIES = new Set(["high", "critical"]);

/**
 * @typedef {{ id: string, title: string, severity: string, url: string, packages: string[] }} Advisory
 * @typedef {{ id: string, reason: string, reviewBy: string }} Waiver
 */

/** GHSA id from an advisory URL, e.g. https://github.com/advisories/GHSA-xxxx-xxxx-xxxx. */
function advisoryId(url) {
  return url.slice(url.lastIndexOf("/") + 1);
}

/**
 * High and critical advisories in the report, one entry per advisory with
 * every package it was reported on.
 * @param {{ vulnerabilities?: Record<string, { via: Array<string | Record<string, unknown>> }> }} report
 * @returns {Advisory[]}
 */
export function failingAdvisories(report) {
  /** @type {Map<string, Advisory>} */
  const advisories = new Map();
  for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via) {
      // String entries point at another package; its own entry carries the advisory.
      if (typeof via === "string" || !FAILING_SEVERITIES.has(String(via.severity))) continue;
      const url = String(via.url);
      const id = advisoryId(url);
      const advisory = advisories.get(id) ?? { id, title: String(via.title), severity: String(via.severity), url, packages: [] };
      const name = String(via.name);
      if (!advisory.packages.includes(name)) advisory.packages.push(name);
      advisories.set(id, advisory);
    }
  }
  return [...advisories.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Splits the report's failing advisories by waiver state. A waiver past its
 * reviewBy date stops covering its advisory, so it has to be looked at again.
 * @param {Parameters<typeof failingAdvisories>[0]} report
 * @param {Waiver[]} waivers
 * @param {string} today YYYY-MM-DD
 * @returns {{ unwaived: Advisory[], expired: Array<Advisory & { waiver: Waiver }>, waived: Advisory[], unused: Waiver[] }}
 */
export function applyWaivers(report, waivers, today) {
  const byId = new Map(waivers.map((waiver) => [waiver.id, waiver]));
  const result = { unwaived: [], expired: [], waived: [], unused: [] };
  const seen = new Set();
  for (const advisory of failingAdvisories(report)) {
    const waiver = byId.get(advisory.id);
    seen.add(advisory.id);
    if (!waiver) result.unwaived.push(advisory);
    else if (today > waiver.reviewBy) result.expired.push({ ...advisory, waiver });
    else result.waived.push(advisory);
  }
  result.unused = waivers.filter((waiver) => !seen.has(waiver.id));
  return result;
}
