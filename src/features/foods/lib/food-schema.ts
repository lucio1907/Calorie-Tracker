import { z } from "zod";
import { foodsStrings } from "../strings";
import type { FoodValues } from "./types";

const v = foodsStrings.validation;

/** Field limits mirror the CHECK constraints on public.foods / public.food_portions. */
export const LIMITS = {
  kcal: { min: 0, max: 900 },
  macro: { min: 0, max: 100 },
  sodiumMg: { min: 0, max: 100000 },
  portionGrams: { max: 10000 },
} as const;

/** Allowed rounding slack when protein + carbs + fat are checked against 100 g. */
const MACRO_TOTAL_TOLERANCE = 1;

const BARCODE_PATTERN = /^\d{8,14}$/;
const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

/** Trims strings; anything else passes through for the schema to reject. */
function trim(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function trimToNull(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  const trimmed = trim(value);
  return trimmed === "" ? null : trimmed;
}

/**
 * Form number: "" -> undefined, "12,5" -> 12.5 (decimal comma is common in
 * Argentina), anything unparseable -> NaN so the schema reports it.
 */
export function toDecimal(value: unknown): unknown {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value === null ? undefined : value;
  const text = value.trim().replace(",", ".");
  if (text === "") return undefined;
  return DECIMAL_PATTERN.test(text) ? Number(text) : Number.NaN;
}

function requiredNumber(min: number, max: number) {
  return z.preprocess(
    toDecimal,
    z
      .number({ error: (issue) => (issue.input === undefined ? v.required : v.number) })
      .min(min, v.range(min, max))
      .max(max, v.range(min, max)),
  );
}

function optionalNumber(min: number, max: number) {
  return z.preprocess(
    toDecimal,
    z
      .number({ error: v.number })
      .min(min, v.range(min, max))
      .max(max, v.range(min, max))
      .optional()
      .transform((value) => value ?? null),
  );
}

/** Strips spaces and dashes a user may type or paste around a barcode. */
export function normalizeBarcode(input: string): string {
  return input.replace(/[\s-]/g, "");
}

export const barcodeSchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizeBarcode(value) : value),
  z.string({ error: v.barcode }).regex(BARCODE_PATTERN, v.barcode),
);

export const foodSchema = z
  .object({
    name: z.preprocess(trim, z.string({ error: v.required }).min(1, v.required).max(200, v.nameLength)),
    brand: z.preprocess(trimToNull, z.string().max(200, v.brandLength).nullable()),
    barcode: z.preprocess(
      (value) => {
        const trimmed = trimToNull(value);
        return typeof trimmed === "string" ? normalizeBarcode(trimmed) : trimmed;
      },
      z.string().regex(BARCODE_PATTERN, v.barcode).nullable(),
    ),
    kcal: requiredNumber(LIMITS.kcal.min, LIMITS.kcal.max),
    protein: requiredNumber(LIMITS.macro.min, LIMITS.macro.max),
    carbs: requiredNumber(LIMITS.macro.min, LIMITS.macro.max),
    fat: requiredNumber(LIMITS.macro.min, LIMITS.macro.max),
    fiber: optionalNumber(LIMITS.macro.min, LIMITS.macro.max),
    sodiumMg: optionalNumber(LIMITS.sodiumMg.min, LIMITS.sodiumMg.max),
  })
  .superRefine((food, context) => {
    if (food.protein + food.carbs + food.fat > 100 + MACRO_TOTAL_TOLERANCE) {
      context.addIssue({ code: "custom", message: v.macrosTotal, path: [] });
    }
  });

export const foodIdSchema = z.coerce.number().int().positive();

export const portionSchema = z.object({
  label: z.preprocess(trim, z.string({ error: v.required }).min(1, v.required).max(100, v.labelLength)),
  grams: z.preprocess(
    toDecimal,
    z
      .number({ error: (issue) => (issue.input === undefined ? v.required : v.number) })
      .gt(0, v.gramsRange)
      .max(LIMITS.portionGrams.max, v.gramsRange),
  ),
});

/** Catalog search text as typed in the search box. */
export const searchQuerySchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.string().max(100),
);

/** Results per page on the Foods screen (few enough to fit one phone screen). */
export const FOODS_PAGE_SIZE = 7;

/** 1-based results page from the query string: digits only, capped so the offset stays small. */
export const foodsPageSchema = z.string().regex(/^\d{1,3}$/).transform(Number).pipe(z.number().int().min(1).max(500));

/** Open Food Facts name search: short queries return noise and burn the rate limit. */
export const offQuerySchema = z.preprocess(trim, z.string().min(3).max(100));

export type FoodFieldName = keyof FoodValues;
export type FoodFieldErrors = Partial<Record<FoodFieldName, string>>;

/** The raw text the user typed, echoed back so a failed submit keeps it. */
export type FoodFormValues = Partial<Record<FoodFieldName, string>>;

export type ParseFoodResult =
  | { ok: true; value: FoodValues }
  | { ok: false; fieldErrors: FoodFieldErrors; formError: string | null; values: FoodFormValues };

const FOOD_FIELDS: FoodFieldName[] = ["name", "brand", "barcode", "kcal", "protein", "carbs", "fat", "fiber", "sodiumMg"];

/** The food form's text fields, as typed. */
export function readFoodFormValues(formData: FormData): FoodFormValues {
  const values: FoodFormValues = {};
  for (const field of FOOD_FIELDS) {
    const raw = formData.get(field);
    if (typeof raw === "string") values[field] = raw;
  }
  return values;
}

/** Reads and validates the food form. */
export function parseFoodForm(formData: FormData): ParseFoodResult {
  const values = readFoodFormValues(formData);

  const result = foodSchema.safeParse(values);
  if (result.success) return { ok: true, value: result.data };

  const flattened = z.flattenError(result.error);
  const fieldErrors: FoodFieldErrors = {};
  for (const field of FOOD_FIELDS) {
    const message = flattened.fieldErrors[field]?.[0];
    if (message) fieldErrors[field] = message;
  }
  return { ok: false, fieldErrors, formError: flattened.formErrors[0] ?? v.fix, values };
}

export type PortionFieldErrors = Partial<Record<"label" | "grams", string>>;

export type ParsePortionResult =
  | { ok: true; value: { label: string; grams: number } }
  | { ok: false; fieldErrors: PortionFieldErrors };

export function parsePortionForm(formData: FormData): ParsePortionResult {
  const result = portionSchema.safeParse({ label: formData.get("label"), grams: formData.get("grams") });
  if (result.success) return { ok: true, value: result.data };

  const { fieldErrors } = z.flattenError(result.error);
  return { ok: false, fieldErrors: { label: fieldErrors.label?.[0], grams: fieldErrors.grams?.[0] } };
}
