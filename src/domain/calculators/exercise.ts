import { assertPositive } from "./assert";

/**
 * Kcal burned = MET x body weight (kg) x duration (hours), rounded to the
 * nearest whole kcal (halves round up; inputs are always positive).
 *
 * @throws InvalidArgumentError On non-positive inputs.
 */
export function exerciseKcal(met: number, weightKg: number, minutes: number): number {
  assertPositive(met, "MET");
  assertPositive(weightKg, "Weight");
  assertPositive(minutes, "Minutes");

  return Math.round((met * weightKg * minutes) / 60);
}
