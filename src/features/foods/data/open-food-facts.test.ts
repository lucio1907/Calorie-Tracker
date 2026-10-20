import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { OFF_CONTACT_EMAIL, OffUnavailableError, fetchOffProduct, searchOffProducts } = await import(
  "./open-food-facts"
);

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function requestOf(call: number): { url: URL; init: RequestInit } {
  const [input, init] = fetchMock.mock.calls[call];
  return { url: new URL(String(input)), init: init ?? {} };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("fetchOffProduct", () => {
  it("requests the v2 product endpoint with limited fields, a User-Agent and a timeout", async () => {
    fetchMock.mockResolvedValue(
      json({
        status: 1,
        product: { code: "7790580660000", product_name: "Polenta", nutriments: { "energy-kcal_100g": 340 } },
      }),
    );

    const result = await fetchOffProduct("7790580660000");

    expect(result.ok).toBe(true);
    const { url, init } = requestOf(0);
    expect(url.origin + url.pathname).toBe("https://world.openfoodfacts.org/api/v2/product/7790580660000");
    expect(url.searchParams.get("fields")).toContain("nutriments");
    expect(new Headers(init.headers).get("User-Agent")).toBe(`contador-calorias/0.1.0 (${OFF_CONTACT_EMAIL})`);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    // A redirect could point the server anywhere; OFF's API never redirects.
    expect(init.redirect).toBe("error");
  });

  it("maps OFF's 404 { status: 0 } to not_found", async () => {
    fetchMock.mockResolvedValue(json({ status: 0, status_verbose: "product not found" }, 404));
    await expect(fetchOffProduct("7790000000000")).resolves.toEqual({ ok: false, reason: "not_found" });
  });

  it.each([
    ["a network error", () => Promise.reject(new TypeError("fetch failed"))],
    ["a timeout", () => Promise.reject(new DOMException("timed out", "TimeoutError"))],
    ["rate limiting", () => Promise.resolve(json({}, 429))],
    ["a server error", () => Promise.resolve(json({}, 503))],
    ["invalid JSON", () => Promise.resolve(new Response("<html>", { status: 200 }))],
  ])("throws OffUnavailableError on %s", async (_label, respond) => {
    fetchMock.mockImplementation(respond);
    await expect(fetchOffProduct("7790580660000")).rejects.toBeInstanceOf(OffUnavailableError);
  });
});

describe("response size cap", () => {
  /** A 200 response streaming `chunks` blocks of 256 KiB; records whether the reader cancelled it. */
  function streamed(chunks: number, block = new Uint8Array(256 * 1024).fill(0x20)) {
    const state = { cancelled: false, sent: 0 };
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (state.sent === chunks) return controller.close();
        state.sent += 1;
        controller.enqueue(block);
      },
      cancel() {
        state.cancelled = true;
      },
    });
    return { state, response: new Response(body, { status: 200 }) };
  }

  it("throws OffUnavailableError and stops reading past about 2 MB", async () => {
    const { state, response } = streamed(1_000);
    fetchMock.mockResolvedValue(response);
    await expect(fetchOffProduct("7790580660000")).rejects.toThrow(/too large/);
    expect(state.cancelled).toBe(true);
    expect(state.sent).toBeLessThanOrEqual(10);
  });

  it("parses a body that arrives in several chunks under the cap", async () => {
    const product = JSON.stringify({
      status: 1,
      product: { code: "7790580660000", product_name: "Polenta", nutriments: { "energy-kcal_100g": 340 } },
    });
    const bytes = new TextEncoder().encode(product);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 10));
        controller.enqueue(bytes.slice(10));
        controller.close();
      },
    });
    fetchMock.mockResolvedValue(new Response(body, { status: 200 }));
    await expect(fetchOffProduct("7790580660000")).resolves.toMatchObject({ ok: true });
  });
});

describe("searchOffProducts", () => {
  it("queries Search-a-licious filtered to Argentina and keeps only usable, unique hits", async () => {
    const usable = {
      code: "7790742625304",
      product_name: "Dulce de leche",
      brands: ["La Serenisima"],
      nutriments: { "energy-kcal_100g": 320, proteins_100g: 5.5, carbohydrates_100g: 55, fat_100g: 7 },
    };
    fetchMock.mockResolvedValue(
      json({ hits: [usable, { ...usable }, { code: "7790957001122", product_name: "Galletitas" }], page: 1 }),
    );

    const results = await searchOffProducts("dulce de leche");

    expect(results).toEqual([
      { barcode: "7790742625304", name: "Dulce de leche", brand: "La Serenisima", kcal: 320, protein: 5.5, carbs: 55, fat: 7 },
    ]);
    const { url } = requestOf(0);
    expect(url.origin + url.pathname).toBe("https://search.openfoodfacts.org/search");
    expect(url.searchParams.get("q")).toBe('dulce de leche countries_tags:"en:argentina"');
    expect(url.searchParams.get("langs")).toBe("es,en");
  });

  it("throws OffUnavailableError when the response has no hits array", async () => {
    fetchMock.mockResolvedValue(json({ error: "bad" }));
    await expect(searchOffProducts("yerba")).rejects.toBeInstanceOf(OffUnavailableError);
  });
});
