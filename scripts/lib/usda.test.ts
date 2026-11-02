import { describe, expect, it } from "vitest";
import { buildUsdaRow, toUsdaRecord, USDA_NUTRIENTS, USDA_SELECTION_COLUMNS, validateUsdaSelection } from "./usda.mjs";

const HEADER = USDA_SELECTION_COLUMNS;

const BREAST = {
  fdcId: "171077",
  name: "Pollo, pechuga sin piel, cruda",
  group: "Aves",
  usdaDescription: "Chicken, broilers or fryers, breast, meat only, raw",
};

function usdaFood(description: string, values: Partial<Record<keyof typeof USDA_NUTRIENTS, number>>) {
  const nutrients = new Map<string, number>();
  for (const [column, id] of Object.entries(USDA_NUTRIENTS)) {
    const value = values[column as keyof typeof USDA_NUTRIENTS];
    if (value !== undefined) nutrients.set(id, value);
  }
  return { description, nutrients };
}

describe("validateUsdaSelection", () => {
  it("reads valid entries", () => {
    const { entries, errors } = validateUsdaSelection([
      HEADER,
      ["171077", "Pollo, pechuga sin piel, cruda", "Aves", "Chicken, broilers or fryers, breast, meat only, raw"],
    ]);

    expect(errors).toEqual([]);
    expect(entries).toEqual([BREAST]);
  });

  it("requires the header", () => {
    const { entries, errors } = validateUsdaSelection([["id", "name"], ["1", "x"]]);

    expect(entries).toEqual([]);
    expect(errors).toEqual([`header must be: ${HEADER.join(",")}`]);
  });

  it("rejects bad ids, repeated ids and repeated names, reporting each line", () => {
    const { entries, errors } = validateUsdaSelection([
      HEADER,
      ["171077", "Pollo, pechuga sin piel, cruda", "Aves", "Chicken breast"],
      ["17x", "Pollo, muslo", "Aves", "Chicken thigh"],
      ["171077", "Pollo, ala", "Aves", "Chicken wing"],
      ["171078", "Pollo, pechuga sin piel, cruda", "Aves", "Chicken breast again"],
      ["171079", "", "Aves", "Nameless"],
    ]);

    expect(entries.map((entry) => entry.fdcId)).toEqual(["171077"]);
    expect(errors).toEqual([
      "line 3: fdc_id must be digits",
      "line 4: duplicate fdc_id 171077",
      'line 5: duplicate name "Pollo, pechuga sin piel, cruda"',
      "line 6: name must be 1-200 characters",
    ]);
  });
});

describe("buildUsdaRow", () => {
  it("maps the SR Legacy nutrients to a catalog row per 100 g, keyed by the FDC id", () => {
    const result = buildUsdaRow(
      BREAST,
      usdaFood(BREAST.usdaDescription, { kcal: 120, protein: 22.5, carbs: 0, fat: 2.62, sodium_mg: 45 }),
    );

    expect(result).toEqual({
      row: {
        code: "171077",
        name: "Pollo, pechuga sin piel, cruda",
        group: "Aves",
        kcal: 120,
        protein: 22.5,
        carbs: 0,
        fat: 2.62,
        fiber: null,
        sodium_mg: 45,
      },
    });
  });

  it("refuses an FDC id that is not in SR Legacy", () => {
    expect(() => buildUsdaRow(BREAST, undefined)).toThrow("fdc_id 171077 is not in the SR Legacy download");
  });

  it("refuses an FDC id whose USDA description does not match the selection (a mistyped id)", () => {
    expect(() => buildUsdaRow(BREAST, usdaFood("Beef, ground, raw", { kcal: 250 }))).toThrow(
      'fdc_id 171077 is "Beef, ground, raw", not "Chicken, broilers or fryers, breast, meat only, raw"',
    );
  });

  it("skips a food without an energy value", () => {
    expect(buildUsdaRow(BREAST, usdaFood(BREAST.usdaDescription, { protein: 22 }))).toEqual({ skipped: "no energy value" });
  });

  it("skips a food whose energy contradicts its macros", () => {
    const result = buildUsdaRow(BREAST, usdaFood(BREAST.usdaDescription, { kcal: 500, protein: 22, carbs: 0, fat: 2 }));

    expect(result).toEqual({ skipped: "declared 500 kcal vs 106 kcal from macros" });
  });
});

describe("toUsdaRecord", () => {
  it("stores the row as a shared USDA food", () => {
    const record = toUsdaRecord({
      code: "171077",
      name: "Pollo, pechuga sin piel, cruda",
      group: "Aves",
      kcal: 120,
      protein: 22.5,
      carbs: 0,
      fat: 2.62,
      fiber: null,
      sodium_mg: 45,
    });

    expect(record).toEqual({
      owner_id: null,
      source: "usda",
      external_code: "171077",
      name: "Pollo, pechuga sin piel, cruda",
      food_group: "Aves",
      kcal_per_100g: 120,
      protein_per_100g: 22.5,
      carbs_per_100g: 0,
      fat_per_100g: 2.62,
      fiber_per_100g: null,
      sodium_mg_per_100g: 45,
    });
  });
});
