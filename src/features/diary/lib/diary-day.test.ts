import { describe, expect, it } from "vitest";
import { Meal } from "@/domain";
import { buildDiaryDay } from "./diary-day";
import type { DiaryEntry } from "./types";

function entry(id: number, meal: Meal, kcal: number, macros: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id,
    meal,
    foodId: id,
    recipeId: null,
    label: `Food ${id}`,
    grams: 100,
    quantity: null,
    portionLabel: null,
    kcal,
    protein: 0,
    carbs: 0,
    fat: 0,
    ...macros,
  };
}

describe("buildDiaryDay", () => {
  it("lists the four main meals in day order even when empty", () => {
    const day = buildDiaryDay([]);
    expect(day.meals.map((section) => section.meal)).toEqual([Meal.Breakfast, Meal.Lunch, Meal.Snack, Meal.Dinner]);
    expect(day.meals.every((section) => section.entries.length === 0)).toBe(true);
    expect(day.totals).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
    expect(day.entryCount).toBe(0);
  });

  it("shows the extra meal only when it has entries", () => {
    const day = buildDiaryDay([entry(1, Meal.Extra, 120)]);
    expect(day.meals.map((section) => section.meal)).toEqual([
      Meal.Breakfast,
      Meal.Lunch,
      Meal.Snack,
      Meal.Dinner,
      Meal.Extra,
    ]);
  });

  it("groups entries by meal, keeping their order", () => {
    const day = buildDiaryDay([entry(1, Meal.Dinner, 500), entry(2, Meal.Breakfast, 300), entry(3, Meal.Dinner, 50)]);
    const dinner = day.meals.find((section) => section.meal === Meal.Dinner);
    expect(dinner?.entries.map((item) => item.id)).toEqual([1, 3]);
    expect(day.meals[0].entries.map((item) => item.id)).toEqual([2]);
  });

  it("totals each meal and the day from the stored snapshots, without drift", () => {
    const day = buildDiaryDay([
      entry(1, Meal.Lunch, 100.1, { protein: 0.1, carbs: 10, fat: 1.15 }),
      entry(2, Meal.Lunch, 200.2, { protein: 0.2, carbs: 20, fat: 2.3 }),
      entry(3, Meal.Snack, 50, { protein: 5, carbs: 0.05, fat: 0 }),
    ]);
    const lunch = day.meals.find((section) => section.meal === Meal.Lunch);
    expect(lunch?.totals).toEqual({ kcal: 300.3, protein: 0.3, carbs: 30, fat: 3.45 });
    expect(day.totals).toEqual({ kcal: 350.3, protein: 5.3, carbs: 30.05, fat: 3.45 });
    expect(day.entryCount).toBe(3);
  });
});
