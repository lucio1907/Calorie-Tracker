import "server-only";
import { buildOffSearchQuery, mapOffProduct, mapOffSearchHit, type OffProductResult } from "../lib/off-mapper";
import type { OffSearchHit } from "../lib/types";

/*
 * Open Food Facts client. Server-side only: the browser never talks to OFF.
 *
 * - Product read: GET https://world.openfoodfacts.org/api/v2/product/{barcode}?fields=...
 * - Name search: Search-a-licious (https://search.openfoodfacts.org/docs). OFF's
 *   v2 API has no full-text search; Search-a-licious is the documented
 *   replacement and accepts Lucene filters such as countries_tags:"en:argentina".
 * - OFF asks for a "AppName/Version (ContactEmail)" User-Agent and rate-limits
 *   reads to 15 req/min (products) and 10 req/min (search) per IP:
 *   https://openfoodfacts.github.io/openfoodfacts-server/api/
 */

const APP_NAME = "contador-calorias";
const APP_VERSION = "0.1.0";
/**
 * Contact OFF asks for in the User-Agent. The single place this address lives;
 * it is sent to Open Food Facts only, never to any other service.
 */
export const OFF_CONTACT_EMAIL = "lugastellu19@gmail.com";
const PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product/";
const SEARCH_URL = "https://search.openfoodfacts.org/search";
const PRODUCT_FIELDS = "code,product_name,product_name_es,product_name_en,brands,nutriments";
const SEARCH_FIELDS = "code,product_name,product_name_es,product_name_en,brands,nutriments";
const TIMEOUT_MS = 8000;
const SEARCH_PAGE_SIZE = 30;
const MAX_SEARCH_RESULTS = 20;

/** OFF did not answer usefully (network error, timeout, rate limit, 5xx). */
export class OffUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OffUnavailableError";
  }
}

/** "AppName/Version (ContactEmail)", the format OFF asks for. */
function userAgent(): string {
  return `${APP_NAME}/${APP_VERSION} (${OFF_CONTACT_EMAIL})`;
}

async function getJson(url: URL, acceptStatuses: number[] = []): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": userAgent(), Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new OffUnavailableError(`OFF request failed: ${url.host}`, { cause: error });
  }

  if (!response.ok && !acceptStatuses.includes(response.status)) {
    throw new OffUnavailableError(`OFF responded ${response.status}: ${url.host}`);
  }
  try {
    return await response.json();
  } catch (error) {
    throw new OffUnavailableError(`OFF sent invalid JSON: ${url.host}`, { cause: error });
  }
}

/** Fetches and maps one product. Unknown barcodes map to `not_found`. */
export async function fetchOffProduct(barcode: string): Promise<OffProductResult> {
  const url = new URL(encodeURIComponent(barcode), PRODUCT_URL);
  url.searchParams.set("fields", PRODUCT_FIELDS);
  // OFF answers 404 with { status: 0 } for unknown products.
  const payload = await getJson(url, [404]);
  return mapOffProduct(payload, barcode);
}

/** Searches products sold in Argentina by name. Only hits with energy are returned. */
export async function searchOffProducts(query: string): Promise<OffSearchHit[]> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", buildOffSearchQuery(query));
  url.searchParams.set("langs", "es,en");
  url.searchParams.set("page_size", String(SEARCH_PAGE_SIZE));
  url.searchParams.set("fields", SEARCH_FIELDS);

  const payload = await getJson(url);
  const hits = typeof payload === "object" && payload !== null && "hits" in payload ? payload.hits : null;
  if (!Array.isArray(hits)) throw new OffUnavailableError("OFF search returned no hits array");

  const seen = new Set<string>();
  const results: OffSearchHit[] = [];
  for (const hit of hits) {
    const mapped = mapOffSearchHit(hit);
    if (!mapped || seen.has(mapped.barcode)) continue;
    seen.add(mapped.barcode);
    results.push(mapped);
    if (results.length === MAX_SEARCH_RESULTS) break;
  }
  return results;
}
