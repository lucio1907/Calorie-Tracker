import { describe, expect, it } from "vitest";
import { InvalidArgumentError } from "./calculators/assert";
import { MEAL_SCHEDULE, suggestMeal } from "./meal-schedule";

const at = (hours: number, minutes = 0) => hours * 60 + minutes;

describe("suggestMeal", () => {
  it.each([
    [at(0), "breakfast"],
    [at(7, 30), "breakfast"],
    [at(10, 59), "breakfast"],
    [at(11), "lunch"],
    [at(14, 59), "lunch"],
    [at(15), "snack"],
    [at(19, 29), "snack"],
    [at(19, 30), "dinner"],
    [at(23, 59), "dinner"],
  ])("suggests the meal for minute %i of the day", (minutes, meal) => {
    expect(suggestMeal(minutes)).toBe(meal);
  });

  it("never suggests the extra slot", () => {
    expect(MEAL_SCHEDULE.map((slot) => slot.meal)).not.toContain("extra");
  });

  it.each([-1, 24 * 60, 61.5, Number.NaN])("rejects %s", (minutes) => {
    expect(() => suggestMeal(minutes)).toThrow(InvalidArgumentError);
  });
});
