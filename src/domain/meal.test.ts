import { describe, expect, it } from "vitest";
import { isMeal, Meal, MEALS } from "./meal";

describe("isMeal", () => {
  it.each(MEALS.map((meal) => [meal]))("accepts %s", (meal) => {
    expect(isMeal(meal)).toBe(true);
  });

  it.each([["brunch"], ["Breakfast"], [""], [null], [1]])("rejects %j", (value) => {
    expect(isMeal(value)).toBe(false);
  });

  it("lists meals in day order", () => {
    expect(MEALS).toEqual([Meal.Breakfast, Meal.Lunch, Meal.Snack, Meal.Dinner, Meal.Extra]);
  });
});
