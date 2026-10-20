import { Sex } from "../sex";

/**
 * Lowest daily calorie target the app will set without medical supervision,
 * per sex (a common clinical guideline for adults).
 */
export const MIN_DAILY_KCAL: Readonly<Record<Sex, number>> = {
  [Sex.Female]: 1200,
  [Sex.Male]: 1500,
};

/** Safe minimum daily target in kcal for `sex`. */
export function minimumDailyKcal(sex: Sex): number {
  return MIN_DAILY_KCAL[sex];
}

/** `target` raised to the safe minimum for `sex` when it falls below it. */
export function applyCalorieFloor(target: number, sex: Sex): number {
  return Math.max(target, minimumDailyKcal(sex));
}
