import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Meal } from "@/domain";
import { buildDiaryDay } from "../lib/diary-day";
import type { DiaryEntry } from "../lib/types";
import { diaryStrings } from "../strings";
import { amountText, MealSection } from "./meal-section";

const t = diaryStrings;

const toast: DiaryEntry = {
  id: 1,
  meal: Meal.Breakfast,
  foodId: 7,
  recipeId: null,
  label: "Pan francés",
  grams: 50,
  quantity: 2,
  portionLabel: "1 slice",
  kcal: 134.5,
  protein: 4.65,
  carbs: 28.7,
  fat: 0.1,
};

const milk: DiaryEntry = {
  ...toast,
  id: 2,
  label: "Leche",
  grams: 200,
  quantity: null,
  portionLabel: null,
  kcal: 124,
  protein: 6.2,
  carbs: 9.6,
  fat: 6,
};

function breakfast(entries: DiaryEntry[]) {
  return buildDiaryDay(entries).meals[0];
}

describe("amountText", () => {
  it("shows portions with their grams", () => {
    expect(amountText(toast)).toBe("2 × 1 slice · 50 g");
  });

  it("shows plain grams", () => {
    expect(amountText(milk)).toBe("200 g");
  });
});

describe("MealSection", () => {
  it("lists entries with kcal and the meal total", () => {
    render(<MealSection section={breakfast([toast, milk])} onAdd={vi.fn()} onEdit={vi.fn()} />);
    const section = screen.getByRole("region", { name: t.meals.breakfast });
    const list = within(section).getByRole("list", { name: t.meal.entries(t.meals.breakfast) });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    // 134.5 + 124 = 258.5 kcal -> "259" (rounded for display only).
    expect(within(section).getByText("259")).toBeInTheDocument();
  });

  it("says when nothing was logged", () => {
    render(<MealSection section={breakfast([])} onAdd={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText(t.meal.empty)).toBeInTheDocument();
  });

  it("opens the add flow and the editor", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onEdit = vi.fn();
    render(<MealSection section={breakfast([toast])} onAdd={onAdd} onEdit={onEdit} />);

    await user.click(screen.getByRole("button", { name: t.meal.addTo(t.meals.breakfast) }));
    expect(onAdd).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: /Pan francés/ }));
    expect(onEdit).toHaveBeenCalledWith(toast);
  });
});
