/**
 * ARGENFOODS catalog helpers shared by the extract and import scripts.
 *
 * Source: Tabla de Composición de Alimentos, ARGENFOODS, Universidad Nacional
 * de Luján (UNLu), https://www.argenfood.unlu.edu.ar/ (group spreadsheets under
 * /Tablas/Grupo/*.xls). Values are per 100 g of edible portion.
 *
 * Terms of use (https://www.argenfood.unlu.edu.ar/Tablas/Varios/Cond_Uso.htm):
 * non-commercial use is authorized as long as the work is not altered and the
 * authors, the copyright holder (UNLu) and the full electronic reference are
 * cited. Commercial use requires written permission from UNLu. This project is
 * a personal, non-commercial tracker; keep the attribution below with the data.
 */

export const ARGENFOODS_ATTRIBUTION =
  "ARGENFOODS, Tabla de Composición de Alimentos, Universidad Nacional de Luján. https://www.argenfood.unlu.edu.ar/";

/** Columns of supabase/data/argenfoods.csv, in order. */
export const ARGENFOODS_COLUMNS = ["code", "name", "group", "kcal", "protein", "carbs", "fat", "fiber", "sodium_mg"];

/** Spreadsheet file stem -> food group as named on the ARGENFOODS index page. */
export const ARGENFOODS_GROUPS = {
  Cereales: "Cereales y derivados",
  Vegetales: "Vegetales y derivados",
  Frutas: "Frutas y derivados",
  Grasas: "Grasas y aceites",
  Pescados: "Pescados, mariscos y conservas",
  Carnes: "Carnes y derivados",
  Leche: "Leche y derivados",
  Huevo: "Huevos y derivados",
  ProdAz: "Productos azucarados",
  Misc: "Misceláneas",
};

/**
 * Sub-group headings whose rows are named only by the cut ("Bife, crudo").
 * Their heading is prepended so each name stands on its own in search.
 */
const QUALIFYING_SUBGROUPS = new Set(["Vacuno, raza caribú", "Vacuno, raza criolla"]);

/** Cells ARGENFOODS uses for "no data". */
const MISSING_VALUES = new Set(["", "...", "..", "-", "—"]);

const LIMITS = {
  kcal: [0, 900],
  protein: [0, 100],
  carbs: [0, 100],
  fat: [0, 100],
  fiber: [0, 100],
  sodium_mg: [0, 100000],
};

/** @param {string} value */
function collapseSpaces(value) {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Parses a nutrient cell. Returns null for "no data", a number otherwise.
 * @param {string | undefined} cell
 * @returns {number | null}
 */
export function parseNutrient(cell) {
  const text = (cell ?? "").trim();
  if (MISSING_VALUES.has(text)) return null;
  if (!/^-?\d+(\.\d+)?$/.test(text)) throw new Error(`not a number: "${text}"`);
  return Number(text);
}

/**
 * Lists the foods of one group sheet (the .xls exported as CSV): code, name
 * and group. Nutrient values are NOT read from the sheets: some of them (e.g.
 * Frutas) have data columns shifted against their header, so values come from
 * the labeled per-food pages instead (see parseFoodPage).
 *
 * @param {string[][]} rows
 * @param {string} group
 * @returns {Array<{ code: string, name: string, group: string }>}
 */
export function listSheetFoods(rows, group) {
  const tagRowIndex = rows.findIndex((row) => row.some((cell) => cell.trim().toUpperCase() === "<ENERC>"));
  if (tagRowIndex < 0) throw new Error(`${group}: tag row with <ENERC> not found`);

  const foods = [];
  let subgroup = "";
  for (const row of rows.slice(tagRowIndex + 1)) {
    const first = (row[0] ?? "").trim();
    const rawName = collapseSpaces(row[1] ?? "");

    if (first === "" && rawName !== "" && row.slice(2).every((cell) => cell.trim() === "")) {
      subgroup = collapseSpaces(rawName.replace(/\(\d+\)\s*$/, ""));
      continue;
    }
    if (!/^\d+$/.test(first) || rawName === "") continue;

    const name = QUALIFYING_SUBGROUPS.has(subgroup) ? `${subgroup}, ${rawName}` : rawName;
    foods.push({ code: first, name, group });
  }
  return foods;
}

/** @param {string} html */
function cellText(html) {
  return collapseSpaces(
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&"),
  );
}

/**
 * Reads the nutrient table of an ARGENFOODS per-food page
 * (https://www.argenfood.unlu.edu.ar/Tablas/Codigo/<code>.htm). Each row is
 * label | value | unit. Returns label -> { value, unit }; the two "Energía"
 * rows are keyed by unit ("Energía kcal", "Energía kj").
 *
 * @param {string} html Page decoded to a JS string (pages are windows-1252).
 * @returns {Map<string, { value: string, unit: string }>}
 */
export function parseFoodPage(html) {
  /** @type {Map<string, { value: string, unit: string }>} */
  const table = new Map();
  // The pages omit most </tr> tags, so split on row starts instead.
  for (const rowHtml of html.split(/<tr[\s>]/i).slice(1)) {
    const cells = [...rowHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(([, cell]) => cellText(cell));
    if (cells.length < 3 || cells[0] === "") continue;
    const [label, value, unit] = cells;
    const key = label === "Energía" ? `Energía ${unit.toLowerCase()}` : label;
    if (!table.has(key)) table.set(key, { value, unit });
  }
  return table;
}

/**
 * Builds a CSV row from a per-food page. Returns null when the page has no
 * energy value; such foods are skipped, never estimated.
 *
 * Carbohydrates: "available" carbohydrates when reported, otherwise total
 * carbohydrates by difference. ARGENFOODS computes energy from the available
 * figure when it exists (Anexo I factors: 4/4/9 kcal per g).
 *
 * @param {{ code: string, name: string, group: string }} food
 * @param {Map<string, { value: string, unit: string }>} page
 * @returns {ArgenfoodsRow | null}
 */
export function buildArgenfoodsRow(food, page) {
  /** @param {string} label @param {string} unit */
  const read = (label, unit) => {
    const entry = page.get(label);
    if (!entry) return null;
    if (entry.unit.toLowerCase() !== unit) throw new Error(`${label}: expected unit ${unit}, got ${entry.unit}`);
    return parseNutrient(entry.value);
  };

  const kcal = read("Energía kcal", "kcal");
  if (kcal === null) return null;
  return {
    ...food,
    kcal,
    protein: read("Proteínas", "g"),
    carbs: read("Carbohidratos disponibles", "g") ?? read("Carbohidratos totales", "g"),
    fat: read("Grasa Total", "g"),
    fiber: read("Fibra dietética", "g"),
    sodium_mg: read("Sodio", "mg"),
  };
}

/**
 * Atwater check (4 kcal/g protein and carbohydrate, 9 kcal/g fat, the factors
 * ARGENFOODS uses). Returns a reason when the declared energy disagrees with
 * the macros by more than 20 kcal and 25 %, which flags source typos or
 * shifted cells. Such rows are excluded rather than corrected.
 *
 * @param {ArgenfoodsRow} row
 * @returns {string | null}
 */
export function energyMismatch(row) {
  const estimate = 4 * (row.protein ?? 0) + 4 * (row.carbs ?? 0) + 9 * (row.fat ?? 0);
  const difference = Math.abs(estimate - row.kcal);
  if (difference > 20 && difference > 0.25 * Math.max(row.kcal, estimate)) {
    return `declared ${row.kcal} kcal vs ${Math.round(estimate)} kcal from macros`;
  }
  return null;
}

/**
 * @typedef {object} ArgenfoodsRow
 * @property {string} code
 * @property {string} name
 * @property {string} group
 * @property {number} kcal
 * @property {number | null} protein
 * @property {number | null} carbs
 * @property {number | null} fat
 * @property {number | null} fiber
 * @property {number | null} sodium_mg
 */

/**
 * Validates parsed CSV rows of supabase/data/argenfoods.csv.
 * @param {string[][]} rows Rows including the header.
 * @returns {{ rows: ArgenfoodsRow[], errors: string[] }}
 */
export function validateArgenfoodsRows(rows) {
  const [header, ...body] = rows;
  if (!header || header.join(",") !== ARGENFOODS_COLUMNS.join(",")) {
    return { rows: [], errors: [`header must be: ${ARGENFOODS_COLUMNS.join(",")}`] };
  }

  /** @type {ArgenfoodsRow[]} */
  const valid = [];
  const errors = [];
  const seenCodes = new Set();

  body.forEach((cells, index) => {
    const line = index + 2;
    if (cells.length === 1 && cells[0] === "") return;
    if (cells.length !== ARGENFOODS_COLUMNS.length) {
      errors.push(`line ${line}: expected ${ARGENFOODS_COLUMNS.length} columns, got ${cells.length}`);
      return;
    }

    const [code, name, group, ...numbers] = cells.map((cell) => cell.trim());
    const rowErrors = [];
    if (!/^\d{1,10}$/.test(code)) rowErrors.push("code must be digits");
    else if (seenCodes.has(code)) rowErrors.push(`duplicate code ${code}`);
    if (name.length < 1 || name.length > 200) rowErrors.push("name must be 1-200 characters");
    if (group.length < 1 || group.length > 100) rowErrors.push("group must be 1-100 characters");

    /** @type {Record<string, number | null>} */
    const values = {};
    ARGENFOODS_COLUMNS.slice(3).forEach((column, columnIndex) => {
      try {
        const value = parseNutrient(numbers[columnIndex]);
        const [min, max] = LIMITS[/** @type {keyof typeof LIMITS} */ (column)];
        if (value !== null && (value < min || value > max)) rowErrors.push(`${column} out of range ${min}-${max}`);
        values[column] = value;
      } catch (error) {
        rowErrors.push(`${column}: ${/** @type {Error} */ (error).message}`);
      }
    });
    if (values.kcal === null) rowErrors.push("kcal is required");

    if (rowErrors.length > 0) {
      errors.push(`line ${line}: ${rowErrors.join("; ")}`);
      return;
    }
    seenCodes.add(code);
    valid.push({
      code,
      name,
      group,
      kcal: /** @type {number} */ (values.kcal),
      protein: values.protein,
      carbs: values.carbs,
      fat: values.fat,
      fiber: values.fiber,
      sodium_mg: values.sodium_mg,
    });
  });

  return { rows: valid, errors };
}

/**
 * Maps a CSV row to a public.foods row. Macros the source does not report are
 * stored as 0 because the columns are NOT NULL; fiber and sodium stay null.
 * @param {ArgenfoodsRow} row
 */
export function toFoodRecord(row) {
  return {
    owner_id: null,
    source: "argenfoods",
    external_code: row.code,
    name: row.name,
    food_group: row.group,
    kcal_per_100g: row.kcal,
    protein_per_100g: row.protein ?? 0,
    carbs_per_100g: row.carbs ?? 0,
    fat_per_100g: row.fat ?? 0,
    fiber_per_100g: row.fiber,
    sodium_mg_per_100g: row.sodium_mg,
  };
}
