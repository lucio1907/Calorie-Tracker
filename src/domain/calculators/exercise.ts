import { assertPositive } from "./assert";

/**
 * Net kcal burned = (MET - 1) x body weight (kg) x duration (hours), rounded
 * to the nearest whole kcal (halves round up).
 *
 * One MET is the resting rate, which the daily target already covers through
 * the BMR, so only the energy above rest is added; activities at or below
 * rest add nothing.
 *
 * @throws InvalidArgumentError On non-positive inputs.
 */
export function exerciseKcal(met: number, weightKg: number, minutes: number): number {
  assertPositive(met, "MET");
  assertPositive(weightKg, "Weight");
  assertPositive(minutes, "Minutes");

  // MET is stored with one decimal: subtract the resting MET in whole tenths so
  // 2.3 - 1 stays 1.3 instead of the binary 1.2999..., which would round 45.5 down.
  const netMetTenths = Math.max(Math.round(met * 10) - 10, 0);
  return Math.round((netMetTenths * weightKg * minutes) / 600);
}
