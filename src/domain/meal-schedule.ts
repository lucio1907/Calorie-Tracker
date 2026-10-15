import { InvalidArgumentError } from "./calculators/assert";
import { Meal } from "./meal";

const MINUTES_PER_DAY = 24 * 60;

/**
 * Default meal by local time of day: a slot applies until (exclusive) its
 * `untilMinute`, counted from local midnight. "extra" is never suggested.
 */
export const MEAL_SCHEDULE: ReadonlyArray<{ meal: Meal; untilMinute: number }> = [
  { meal: Meal.Breakfast, untilMinute: 11 * 60 }, // before 11:00
  { meal: Meal.Lunch, untilMinute: 15 * 60 }, // before 15:00
  { meal: Meal.Snack, untilMinute: 19 * 60 + 30 }, // before 19:30
  { meal: Meal.Dinner, untilMinute: MINUTES_PER_DAY }, // rest of the day
];

/**
 * Meal to preselect when logging at `minuteOfDay` (0-1439, local time).
 * @throws InvalidArgumentError When the minute is not a whole number in range.
 */
export function suggestMeal(minuteOfDay: number): Meal {
  if (!Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay >= MINUTES_PER_DAY) {
    throw new InvalidArgumentError(`Minute of day must be a whole number from 0 to 1439, got ${minuteOfDay}.`);
  }
  const slot = MEAL_SCHEDULE.find((candidate) => minuteOfDay < candidate.untilMinute);
  return slot ? slot.meal : Meal.Dinner;
}
