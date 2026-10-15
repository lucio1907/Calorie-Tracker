import { describe, expect, it } from "vitest";
import {
  ARGENFOODS_COLUMNS,
  buildArgenfoodsRow,
  energyMismatch,
  listSheetFoods,
  parseFoodPage,
  parseNutrient,
  toFoodRecord,
  validateArgenfoodsRows,
} from "./argenfoods.mjs";

const HEADER = ARGENFOODS_COLUMNS;

/** Same markup as https://www.argenfood.unlu.edu.ar/Tablas/Codigo/<code>.htm (rows without </tr>). */
function foodPage(rows: Array<[string, string, string]>): string {
  const body = rows
    .map(
      ([label, value, unit]) =>
        `<tr bgcolor="#FFFFFF" valign=middle><td><p class="C1">${label}</p></td><td><p class="C2"> ${value}&nbsp;</p></td><td><p class="C3">${unit}&nbsp;</p></td><td><p class="C3">\n`,
    )
    .join("");
  return `<html><table><tr><td><p class="T1">Ananá</p></td></tr>\n${body}</table></html>`;
}

describe("parseNutrient", () => {
  it.each([
    ["12.5", 12.5],
    [" 0 ", 0],
    ["", null],
    ["...", null],
    ["-", null],
  ])("parses %j", (cell, expected) => {
    expect(parseNutrient(cell)).toBe(expected);
  });

  it("rejects text that is not a plain decimal", () => {
    expect(() => parseNutrient("12,5")).toThrow(/not a number/);
    expect(() => parseNutrient("tr")).toThrow(/not a number/);
  });
});

describe("listSheetFoods", () => {
  const sheet = [
    ["", "CARNES Y DERIVADOS", "", "", ""],
    [" Nº", "Alimento", "Género", "", "Energía (kj)", "Energía (Kcal)"],
    ["", "", "", "", "<ENERC>", "<ENERC>"],
    ["", "Cerdo", "", "", "", ""],
    ["218", "Cerdo,  chorizo, fresco ", "", "", "1900.9", "454"],
    ["", "Vacuno, raza caribú", "", "", "", ""],
    ["243", "Bife, crudo", "", "", "502.4", "120"],
    ["", "Cerdo (1)", "", "", "", ""],
    ["258", "Bola de lomo", "", "", "", ""],
    ["", "(1): Cerdos de diversas razas", "", "", "", ""],
  ];

  it("lists coded rows with collapsed names and the group", () => {
    expect(listSheetFoods(sheet, "Carnes y derivados")).toEqual([
      { code: "218", name: "Cerdo, chorizo, fresco", group: "Carnes y derivados" },
      { code: "243", name: "Vacuno, raza caribú, Bife, crudo", group: "Carnes y derivados" },
      { code: "258", name: "Bola de lomo", group: "Carnes y derivados" },
    ]);
  });

  it("fails loudly when the INFOODS tag row is missing", () => {
    expect(() => listSheetFoods([["1", "x"]], "X")).toThrow(/<ENERC>/);
  });
});

describe("parseFoodPage + buildArgenfoodsRow", () => {
  const food = { code: "120", name: "Ananá, pulpa, fresco", group: "Frutas y derivados" };

  it("reads values by label and keys the two energy rows by unit", () => {
    const page = parseFoodPage(
      foodPage([
        ["Energía", "242.8", "kj"],
        ["Energía", "58", "kcal"],
        ["Proteínas", "0.4", "g"],
      ]),
    );
    expect(page.get("Energía kcal")).toEqual({ value: "58", unit: "kcal" });
    expect(page.get("Energía kj")).toEqual({ value: "242.8", unit: "kj" });
    expect(page.get("Proteínas")).toEqual({ value: "0.4", unit: "g" });
  });

  it("prefers available carbohydrates and falls back to total carbohydrates", () => {
    const base: Array<[string, string, string]> = [
      ["Energía", "58", "kcal"],
      ["Proteínas", "0.4", "g"],
      ["Grasa Total", "0.2", "g"],
      ["Carbohidratos totales", "13.7", "g"],
      ["Fibra dietética", "", "g"],
      ["Sodio", "2", "mg"],
    ];
    const withTotalOnly = buildArgenfoodsRow(food, parseFoodPage(foodPage([...base, ["Carbohidratos disponibles", "", "g"]])));
    expect(withTotalOnly).toEqual({ ...food, kcal: 58, protein: 0.4, carbs: 13.7, fat: 0.2, fiber: null, sodium_mg: 2 });

    const withAvailable = buildArgenfoodsRow(food, parseFoodPage(foodPage([...base, ["Carbohidratos disponibles", "12.1", "g"]])));
    expect(withAvailable?.carbs).toBe(12.1);
  });

  it("returns null when the food has no energy value (never estimated)", () => {
    expect(buildArgenfoodsRow(food, parseFoodPage(foodPage([["Energía", "", "kcal"]])))).toBeNull();
  });

  it("rejects a value with an unexpected unit", () => {
    const page = parseFoodPage(foodPage([["Energía", "58", "kcal"], ["Sodio", "2", "g"]]));
    expect(() => buildArgenfoodsRow(food, page)).toThrow(/expected unit mg/);
  });
});

describe("energyMismatch", () => {
  const row = { code: "1", name: "x", group: "g", fiber: null, sodium_mg: null };

  it("accepts energy consistent with 4/4/9 Atwater factors", () => {
    expect(energyMismatch({ ...row, kcal: 339, protein: 6.9, carbs: 77.5, fat: 0.2 })).toBeNull();
  });

  it("flags energy that contradicts the macros", () => {
    expect(energyMismatch({ ...row, kcal: 46, protein: 23.9, carbs: 7.7, fat: 3.7 })).toMatch(/declared 46 kcal/);
  });

  it("ignores small absolute differences on low-energy foods", () => {
    expect(energyMismatch({ ...row, kcal: 20, protein: 1, carbs: 1, fat: 0 })).toBeNull();
  });
});

describe("validateArgenfoodsRows", () => {
  it("accepts valid rows and keeps empty cells as null", () => {
    const result = validateArgenfoodsRows([
      HEADER,
      ["148", "Aceite de girasol", "Grasas y aceites", "900", "", "", "100", "", ""],
    ]);
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        code: "148",
        name: "Aceite de girasol",
        group: "Grasas y aceites",
        kcal: 900,
        protein: null,
        carbs: null,
        fat: 100,
        fiber: null,
        sodium_mg: null,
      },
    ]);
  });

  it("requires the exact header", () => {
    expect(validateArgenfoodsRows([["name", "kcal"]]).errors[0]).toMatch(/header must be/);
  });

  it("reports missing kcal, out-of-range values, bad codes and duplicates with line numbers", () => {
    const { rows, errors } = validateArgenfoodsRows([
      HEADER,
      ["1", "Arroz", "Cereales", "339", "6.9", "77.5", "0.2", "1.7", "4"],
      ["1", "Arroz bis", "Cereales", "339", "", "", "", "", ""],
      ["2", "Sin energía", "Cereales", "", "1", "1", "1", "", ""],
      ["3", "Fibra rara", "Frutas", "50", "1", "1", "1", "247", ""],
      ["x", "Código malo", "Frutas", "50", "", "", "", "", ""],
      ["4", "Corta", "Frutas"],
    ]);
    expect(rows.map((row) => row.code)).toEqual(["1"]);
    expect(errors).toEqual([
      "line 3: duplicate code 1",
      "line 4: kcal is required",
      "line 5: fiber out of range 0-100",
      "line 6: code must be digits",
      "line 7: expected 9 columns, got 3",
    ]);
  });
});

describe("toFoodRecord", () => {
  it("maps to a shared ARGENFOODS row; unreported macros become 0, fiber/sodium stay null", () => {
    expect(
      toFoodRecord({
        code: "216",
        name: "Cerdo, jamón cocido",
        group: "Carnes y derivados",
        kcal: 211,
        protein: 20.3,
        carbs: null,
        fat: 14.4,
        fiber: null,
        sodium_mg: 1900,
      }),
    ).toEqual({
      owner_id: null,
      source: "argenfoods",
      external_code: "216",
      name: "Cerdo, jamón cocido",
      food_group: "Carnes y derivados",
      kcal_per_100g: 211,
      protein_per_100g: 20.3,
      carbs_per_100g: 0,
      fat_per_100g: 14.4,
      fiber_per_100g: null,
      sodium_mg_per_100g: 1900,
    });
  });
});
