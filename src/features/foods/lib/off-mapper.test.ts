import { describe, expect, it } from "vitest";
import { buildOffSearchQuery, kcalPer100g, mapOffProduct, mapOffSearchHit } from "./off-mapper";

/** Trimmed from a real response of GET /api/v2/product/7790580660000. */
function polentaPayload(nutriments: Record<string, unknown> = {}, product: Record<string, unknown> = {}) {
  return {
    code: "7790580660000",
    status: 1,
    status_verbose: "product found",
    product: {
      code: "7790580660000",
      brands: "Arcor, Prestopronta",
      product_name: "Polenta Instantánea",
      product_name_es: "Polenta Instantánea",
      nutriments: {
        "energy-kcal_100g": 340,
        energy_100g: 1420,
        proteins_100g: 7,
        carbohydrates_100g: 78,
        fat_100g: 0.8,
        fiber_100g: 2.2,
        sodium_100g: 0.0123,
        ...nutriments,
      },
      ...product,
    },
  };
}

describe("kcalPer100g", () => {
  it("prefers energy-kcal_100g", () => {
    expect(kcalPer100g({ "energy-kcal_100g": 340, energy_100g: 1000 })).toBe(340);
  });

  it("falls back to energy_100g (kJ) / 4.184", () => {
    expect(kcalPer100g({ energy_100g: 1420 })).toBe(339.39);
  });

  it("returns null without any energy value", () => {
    expect(kcalPer100g({ proteins_100g: 3 })).toBeNull();
  });
});

describe("mapOffProduct", () => {
  it("maps a product to per-100 g food values (sodium g -> mg, first brand)", () => {
    expect(mapOffProduct(polentaPayload(), "7790580660000")).toEqual({
      ok: true,
      food: {
        name: "Polenta Instantánea",
        brand: "Arcor",
        barcode: "7790580660000",
        kcal: 340,
        protein: 7,
        carbs: 78,
        fat: 0.8,
        fiber: 2.2,
        sodiumMg: 12.3,
      },
    });
  });

  it("uses the kJ fallback when energy-kcal_100g is missing", () => {
    const result = mapOffProduct(polentaPayload({ "energy-kcal_100g": undefined }), "7790580660000");
    expect(result.ok && result.food.kcal).toBe(339.39);
  });

  it("rejects products without energy instead of guessing", () => {
    const payload = polentaPayload({ "energy-kcal_100g": undefined, energy_100g: undefined });
    expect(mapOffProduct(payload, "7790580660000")).toEqual({ ok: false, reason: "no_energy" });
  });

  it("rejects products without nutriments", () => {
    expect(mapOffProduct(polentaPayload({}, { nutriments: undefined }), "7790580660000")).toEqual({
      ok: false,
      reason: "no_energy",
    });
  });

  it.each([
    ["kJ typed as kcal", { "energy-kcal_100g": 1420 }],
    ["negative value", { fat_100g: -1 }],
    ["macro over 100 g", { carbohydrates_100g: 180 }],
    ["macros adding up to more than 100 g", { proteins_100g: 40, carbohydrates_100g: 50, fat_100g: 20 }],
    ["sodium over 100 g", { sodium_100g: 120 }],
  ])("rejects implausible data: %s", (_label, nutriments) => {
    expect(mapOffProduct(polentaPayload(nutriments), "7790580660000")).toEqual({ ok: false, reason: "invalid" });
  });

  it("treats unknown barcodes (status 0) as not found", () => {
    expect(mapOffProduct({ code: "7790000000000", status: 0, status_verbose: "product not found" }, "7790000000000")).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(mapOffProduct(null, "7790000000000")).toEqual({ ok: false, reason: "not_found" });
  });

  it("accepts numeric strings, defaults missing macros to 0 and keeps fiber/sodium null", () => {
    const payload = polentaPayload(
      {
        "energy-kcal_100g": "42",
        proteins_100g: undefined,
        carbohydrates_100g: "10.6",
        fat_100g: undefined,
        fiber_100g: undefined,
        sodium_100g: undefined,
      },
      { product_name_es: undefined, product_name: "  Gaseosa   cola  ", brands: undefined },
    );
    expect(mapOffProduct(payload, "7790580660000")).toEqual({
      ok: true,
      food: {
        name: "Gaseosa cola",
        brand: null,
        barcode: "7790580660000",
        kcal: 42,
        protein: 0,
        carbs: 10.6,
        fat: 0,
        fiber: null,
        sodiumMg: null,
      },
    });
  });

  it("falls back to the requested barcode and uses it as name when OFF has none", () => {
    const payload = polentaPayload({}, { code: "abc", product_name: undefined, product_name_es: undefined });
    const result = mapOffProduct(payload, "7790580660000");
    expect(result.ok && [result.food.barcode, result.food.name]).toEqual(["7790580660000", "7790580660000"]);
  });
});

describe("mapOffSearchHit", () => {
  const hit = {
    code: "7790742625304",
    brands: ["La Serenisima"],
    product_name: "Dulce de leche clásico",
    nutriments: { "energy-kcal_100g": 320, proteins_100g: 5.5, carbohydrates_100g: 55, fat_100g: 7 },
  };

  it("maps a Search-a-licious hit", () => {
    expect(mapOffSearchHit(hit)).toEqual({
      barcode: "7790742625304",
      name: "Dulce de leche clásico",
      brand: "La Serenisima",
      kcal: 320,
      protein: 5.5,
      carbs: 55,
      fat: 7,
    });
  });

  it.each([
    ["no energy", { ...hit, nutriments: { proteins_100g: 5 } }],
    ["no nutriments", { ...hit, nutriments: undefined }],
    ["no name", { ...hit, product_name: undefined }],
    ["invalid barcode", { ...hit, code: "12" }],
  ])("drops hits with %s", (_label, value) => {
    expect(mapOffSearchHit(value)).toBeNull();
  });
});

describe("buildOffSearchQuery", () => {
  it("adds the Argentina filter", () => {
    expect(buildOffSearchQuery("dulce de leche")).toBe('dulce de leche countries_tags:"en:argentina"');
  });

  it("strips Lucene syntax and neutralizes boolean operators", () => {
    expect(buildOffSearchQuery('  yerba* OR brands:"x" (mate)  ')).toBe('yerba or brands x mate countries_tags:"en:argentina"');
  });
});
