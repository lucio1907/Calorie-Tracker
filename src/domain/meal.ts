/** Meal slot a food entry belongs to. Values match the database. */
export const Meal = {
  Breakfast: "breakfast",
  Lunch: "lunch",
  Snack: "snack",
  Dinner: "dinner",
  Extra: "extra",
} as const;

export type Meal = (typeof Meal)[keyof typeof Meal];

/** Meals in the order they appear during the day. */
export const MEALS: readonly Meal[] = Object.values(Meal);

/** True for one of the meal slot values stored in food_entries.meal. */
export function isMeal(value: unknown): value is Meal {
  return typeof value === "string" && (MEALS as readonly string[]).includes(value);
}
