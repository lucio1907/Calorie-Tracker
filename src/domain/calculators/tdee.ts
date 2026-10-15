import { activityMultiplier, type ActivityLevel } from "../activity-level";
import { goalSign, type Goal } from "../goal";
import { assertNonNegative, assertPositive } from "./assert";

/** Approximate energy content of one kilogram of body fat. */
export const KCAL_PER_KG = 7700;

/**
 * TDEE in kcal/day = BMR x activity multiplier.
 *
 * @throws InvalidArgumentError When BMR is not positive.
 */
export function calculateTdee(bmr: number, level: ActivityLevel): number {
  assertPositive(bmr, "BMR");

  return bmr * activityMultiplier(level);
}

/**
 * Daily kcal adjustment for a weekly weight change rate.
 *
 * The rate is a magnitude in kg/week; the goal gives the sign
 * (negative when losing, zero when maintaining).
 *
 * @throws InvalidArgumentError When the rate is negative.
 */
export function dailyAdjustment(goal: Goal, kgPerWeek: number): number {
  assertNonNegative(kgPerWeek, "Weekly rate");

  return (goalSign(goal) * kgPerWeek * KCAL_PER_KG) / 7;
}

/**
 * Daily calorie target = TDEE + goal adjustment.
 *
 * @throws InvalidArgumentError On invalid inputs.
 */
export function calorieTarget(bmr: number, level: ActivityLevel, goal: Goal, kgPerWeek = 0): number {
  return calculateTdee(bmr, level) + dailyAdjustment(goal, kgPerWeek);
}
