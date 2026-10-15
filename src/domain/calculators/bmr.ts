import { Sex } from "../sex";
import { assertInteger, assertPositive } from "./assert";

/**
 * Youngest age, in whole years, the app computes targets for: Mifflin-St Jeor
 * and the safe calorie minimums are adult guidelines.
 */
export const MIN_AGE_YEARS = 18;

export interface BmrInput {
  /** Body weight in kilograms. */
  weightKg: number;
  /** Height in centimeters. */
  heightCm: number;
  /** Age in whole years. */
  ageYears: number;
  sex: Sex;
}

/**
 * Basal metabolic rate in kcal/day (Mifflin-St Jeor).
 *
 * Men:   10w + 6.25h - 5a + 5
 * Women: 10w + 6.25h - 5a - 161
 *
 * @throws InvalidArgumentError On non-positive inputs or a fractional age.
 */
export function calculateBmr({ weightKg, heightCm, ageYears, sex }: BmrInput): number {
  assertPositive(weightKg, "Weight");
  assertPositive(heightCm, "Height");
  assertPositive(ageYears, "Age");
  assertInteger(ageYears, "Age");

  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;

  return sex === Sex.Male ? base + 5 : base - 161;
}
