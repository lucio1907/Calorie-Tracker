"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AnchoredTransition, Button, dayTransitionType, PageHeader, Sheet } from "@/components/ui";
import type { CalendarDate, Meal } from "@/domain";
import { FoodFormContainer } from "@/features/foods/containers/food-form-container";
import { OffSearchContainer } from "@/features/foods/containers/off-search-container";
import type { FoodSummary } from "@/features/foods/lib/types";
import type { Recipe } from "@/features/recipes/lib/types";
import { DateNav, diaryHref } from "../components/date-nav";
import { DayTotals } from "../components/day-totals";
import { MealSection } from "../components/meal-section";
import type { DiaryDay } from "../lib/diary-day";
import type { DiaryEntry } from "../lib/types";
import { diaryStrings as t } from "../strings";
import { AddEntryContainer, AddRecipeEntryContainer, EditEntryContainer } from "./entry-form-containers";
import { FoodPickerContainer } from "./food-picker-container";

type Panel =
  | { kind: "pick"; meal: Meal }
  | { kind: "off"; meal: Meal; query: string }
  | { kind: "create-food"; meal: Meal }
  | { kind: "log"; meal: Meal; foodId: number }
  | { kind: "log-recipe"; meal: Meal; recipe: Recipe }
  | { kind: "edit"; entry: DiaryEntry };

function panelTitle(panel: Panel): string {
  switch (panel.kind) {
    case "pick":
    case "log":
    case "log-recipe":
      return t.add.title(t.meals[panel.meal]);
    case "off":
      return t.add.offTitle;
    case "create-food":
      return t.add.newFoodTitle;
    case "edit":
      return t.edit.title;
  }
}

type DiaryScreenContainerProps = {
  date: CalendarDate;
  today: CalendarDate;
  day: DiaryDay;
  /** Meal preselected by "Log food" (by time of day when viewing today). */
  suggestedMeal: Meal;
  recentFoods: FoodSummary[];
  initialFoods: FoodSummary[];
  recipes: Recipe[];
};

/**
 * Diary screen: date navigation, day totals, meal sections, and the sheet
 * that hosts the add-food flow (pick a food -> amount) and the entry editor.
 * Mutations refresh the server-rendered day in the same round trip.
 */
export function DiaryScreenContainer({
  date,
  today,
  day,
  suggestedMeal,
  recentFoods,
  initialFoods,
  recipes,
}: DiaryScreenContainerProps) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel | null>(null);
  const close = useCallback(() => setPanel(null), []);

  function renderPanel(current: Panel) {
    switch (current.kind) {
      case "pick":
        return (
          <FoodPickerContainer
            recentFoods={recentFoods}
            initialFoods={initialFoods}
            recipes={recipes}
            onPick={(foodId) => setPanel({ kind: "log", meal: current.meal, foodId })}
            onPickRecipe={(recipe) => setPanel({ kind: "log-recipe", meal: current.meal, recipe })}
            onSearchOff={(query) => setPanel({ kind: "off", meal: current.meal, query })}
            onCreateFood={() => setPanel({ kind: "create-food", meal: current.meal })}
          />
        );
      case "off":
        return (
          <OffSearchContainer
            key={current.query}
            initialQuery={current.query}
            onImported={(foodId) => setPanel({ kind: "log", meal: current.meal, foodId })}
          />
        );
      case "create-food":
        return (
          <FoodFormContainer
            onSaved={(foodId) => setPanel({ kind: "log", meal: current.meal, foodId })}
            onCancel={() => setPanel({ kind: "pick", meal: current.meal })}
          />
        );
      case "log":
        return (
          <AddEntryContainer
            key={current.foodId}
            foodId={current.foodId}
            meal={current.meal}
            date={date}
            onSaved={close}
            onBack={() => setPanel({ kind: "pick", meal: current.meal })}
          />
        );
      case "log-recipe":
        return (
          <AddRecipeEntryContainer
            key={current.recipe.id}
            recipe={current.recipe}
            meal={current.meal}
            date={date}
            onSaved={close}
            onBack={() => setPanel({ kind: "pick", meal: current.meal })}
          />
        );
      case "edit":
        return <EditEntryContainer key={current.entry.id} entry={current.entry} recipes={recipes} onDone={close} />;
    }
  }

  return (
    <div className="flex flex-col gap-24">
      {/* Title and date navigation stay put while the day's content slides. */}
      <AnchoredTransition name="diary-day-header">
        <div className="flex flex-col gap-24">
          <PageHeader
            title={t.title}
            description={t.description}
            actions={
              <Button variant="primary" onClick={() => setPanel({ kind: "pick", meal: suggestedMeal })}>
                <Plus aria-hidden="true" size={18} />
                <span>{t.logFood}</span>
              </Button>
            }
          />

          <DateNav
            date={date}
            today={today}
            onPick={(picked) => router.push(diaryHref(picked, today), { transitionTypes: [dayTransitionType(date, picked)] })}
          />
        </div>
      </AnchoredTransition>

      <DayTotals totals={day.totals} />

      {day.entryCount === 0 ? <p className="text-body text-ink-muted">{t.day.empty}</p> : null}

      <div className="flex flex-col gap-16">
        {day.meals.map((section) => (
          <MealSection
            key={section.meal}
            section={section}
            onAdd={() => setPanel({ kind: "pick", meal: section.meal })}
            onEdit={(entry) => setPanel({ kind: "edit", entry })}
          />
        ))}
      </div>

      <Sheet open={panel !== null} onClose={close} title={panel ? panelTitle(panel) : ""} closeLabel={t.add.close}>
        {panel ? renderPanel(panel) : null}
      </Sheet>
    </div>
  );
}
