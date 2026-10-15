import { assertNonNegative } from "./assert";

/**
 * Remaining kcal = target - consumed + burned.
 *
 * A negative result means the day is over target.
 *
 * @throws InvalidArgumentError On negative inputs.
 */
export function remainingKcal(target: number, consumed: number, burned: number): number {
  assertNonNegative(target, "Target");
  assertNonNegative(consumed, "Consumed");
  assertNonNegative(burned, "Burned");

  return target - consumed + burned;
}
