"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { CalendarDate, Meal } from "@/domain";
import { useFoodDetail } from "@/features/foods/hooks/use-food-detail";
import { toInputValue } from "@/features/foods/lib/format";
import type { Recipe } from "@/features/recipes/lib/types";
import { createEntry, deleteEntry, updateEntry } from "../actions/entry-actions";
import { EntryForm, type EntryFormDefaults } from "../components/entry-form";
import { GRAMS_UNIT } from "../lib/entry-amount";
import { recipeAsFood, recipeProblemMessage, type LoggableFood } from "../lib/recipe-food";
import { initialEntryFormState, type DiaryEntry, type EntryFormState } from "../lib/types";
import { diaryStrings } from "../strings";

const t = diaryStrings;

/** Loading / error states while the food (per-100 g values and portions) loads. */
function FoodLoadState({ status, onRetry }: { status: "loading" | "not_found" | "error"; onRetry: () => void }) {
  if (status === "loading") {
    return (
      <div role="status" className="flex flex-col gap-12">
        <span className="sr-only">{t.add.loadingFood}</span>
        <div aria-hidden="true" className="h-24 w-200 animate-pulse rounded-buttons bg-surface-alt" />
        <div aria-hidden="true" className="h-160 animate-pulse rounded-cards bg-surface-alt" />
      </div>
    );
  }
  return (
    <div role="alert" className="flex flex-col items-start gap-12">
      <p className="text-body text-danger-ink">
        {status === "not_found" ? t.errors.foodMissing : t.entryForm.foodLoadFailed}
      </p>
      {status === "error" ? <Button onClick={onRetry}>{t.entryForm.retry}</Button> : null}
    </div>
  );
}

/** Start with one portion (a recipe: one serving) when the food has any, otherwise 100 g. */
function createDefaults(food: LoggableFood, meal: Meal): EntryFormDefaults {
  const first = food.portions[0];
  return first ? { meal, unit: String(first.id), amount: "1" } : { meal, unit: GRAMS_UNIT, amount: "100" };
}

/** Restore how the entry was logged; fall back to grams when its portion is gone. */
function editDefaults(entry: DiaryEntry, food: LoggableFood | null): EntryFormDefaults {
  const portion =
    entry.quantity !== null && entry.portionLabel !== null
      ? food?.portions.find((candidate) => candidate.label === entry.portionLabel)
      : undefined;
  return portion && entry.quantity !== null
    ? { meal: entry.meal, unit: String(portion.id), amount: toInputValue(entry.quantity) }
    : { meal: entry.meal, unit: GRAMS_UNIT, amount: toInputValue(entry.grams) };
}

type AddEntryContainerProps = {
  foodId: number;
  meal: Meal;
  date: CalendarDate;
  onSaved: () => void;
  onBack: () => void;
};

function useCreateEntry(onSaved: () => void) {
  return useActionState(async (previous: EntryFormState, formData: FormData) => {
    const next = await createEntry(previous, formData);
    if (next.status === "saved") onSaved();
    return next;
  }, initialEntryFormState);
}

/** Second step of "add food": amount for the picked food, saved with createEntry. */
export function AddEntryContainer({ foodId, meal, date, onSaved, onBack }: AddEntryContainerProps) {
  const { food, status, reload } = useFoodDetail(foodId);
  const [state, formAction, pending] = useCreateEntry(onSaved);

  if (!food) {
    return (
      <div className="flex flex-col gap-16">
        <FoodLoadState status={status === "ready" ? "error" : status} onRetry={reload} />
        <div>
          <Button variant="ghost" onClick={onBack}>
            {t.add.back}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <EntryForm
      food={food}
      canDefineUnit
      title={food.name}
      defaults={createDefaults(food, meal)}
      hidden={{ date, foodId: String(food.id) }}
      submitLabel={t.entryForm.save}
      state={state}
      action={formAction}
      pending={pending}
      onCancel={onBack}
      cancelLabel={t.add.back}
    />
  );
}

type AddRecipeEntryContainerProps = Omit<AddEntryContainerProps, "foodId"> & { recipe: Recipe };

/**
 * Second step for a recipe: the same form, with one serving as the only
 * portion. The server recomputes everything from the stored ingredients.
 */
export function AddRecipeEntryContainer({ recipe, meal, date, onSaved, onBack }: AddRecipeEntryContainerProps) {
  const [state, formAction, pending] = useCreateEntry(onSaved);
  const asFood = recipeAsFood(recipe);

  if (!asFood.ok) {
    return (
      <div className="flex flex-col items-start gap-16">
        <p className="text-body-lg font-semibold text-ink">{recipe.name}</p>
        <p role="alert" className="text-body text-danger-ink">
          {recipeProblemMessage(asFood.error)}
        </p>
        <Button variant="ghost" onClick={onBack}>
          {t.add.back}
        </Button>
      </div>
    );
  }

  return (
    <EntryForm
      food={asFood.food}
      title={recipe.name}
      defaults={createDefaults(asFood.food, meal)}
      hidden={{ date, recipeId: String(recipe.id) }}
      submitLabel={t.entryForm.save}
      state={state}
      action={formAction}
      pending={pending}
      onCancel={onBack}
      cancelLabel={t.add.back}
    />
  );
}

type EditEntryContainerProps = {
  entry: DiaryEntry;
  onDone: () => void;
};

function DeleteEntryControl({ entry, onDeleted }: { entry: DiaryEntry; onDeleted: () => void }) {
  const [phase, setPhase] = useState<"idle" | "confirming">("idle");
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  function confirm() {
    setError(null);
    startDelete(async () => {
      const result = await deleteEntry(entry.id);
      if (result.ok) onDeleted();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-8 border-t border-border pt-16">
      {phase === "idle" ? (
        <div>
          <Button variant="danger" onClick={() => setPhase("confirming")}>
            {t.edit.delete}
          </Button>
        </div>
      ) : (
        <div role="group" aria-labelledby="delete-entry-question" className="flex flex-col gap-8">
          <p id="delete-entry-question" className="text-body text-ink">
            {t.edit.confirmDelete(entry.label)}
          </p>
          <div className="flex flex-wrap gap-8">
            <Button variant="danger" onClick={confirm} disabled={deleting}>
              {deleting ? t.edit.deleting : t.edit.confirmDeleteAction}
            </Button>
            <Button onClick={() => setPhase("idle")} disabled={deleting}>
              {t.edit.cancel}
            </Button>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-body text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function EditEntryForm({
  entry,
  food,
  canDefineUnit = false,
  unavailableNote,
  onDone,
}: EditEntryContainerProps & { food: LoggableFood | null; canDefineUnit?: boolean; unavailableNote?: string }) {
  const [state, formAction, pending] = useActionState(async (previous: EntryFormState, formData: FormData) => {
    const next = await updateEntry(previous, formData);
    if (next.status === "saved") onDone();
    return next;
  }, initialEntryFormState);

  return (
    <EntryForm
      food={food}
      canDefineUnit={canDefineUnit}
      title={entry.label}
      defaults={editDefaults(entry, food)}
      logged={{ grams: entry.grams, nutrients: entry }}
      unavailableNote={unavailableNote}
      hidden={{ entryId: String(entry.id) }}
      submitLabel={t.entryForm.update}
      state={state}
      action={formAction}
      pending={pending}
      footer={<DeleteEntryControl entry={entry} onDeleted={onDone} />}
    />
  );
}

function EditLinkedEntry({ entry, foodId, onDone }: EditEntryContainerProps & { foodId: number }) {
  const { food, status, reload } = useFoodDetail(foodId);
  if (status === "loading") return <FoodLoadState status="loading" onRetry={reload} />;
  if (status === "error" && !food) return <FoodLoadState status="error" onRetry={reload} />;
  // not_found: the food was deleted after the entry list loaded; edit like a deleted food.
  return <EditEntryForm entry={entry} food={food} canDefineUnit onDone={onDone} />;
}

/** Edit an entry's meal and amount, or delete it. `recipes` are the caller's, for recipe entries. */
export function EditEntryContainer({ entry, recipes, onDone }: EditEntryContainerProps & { recipes: Recipe[] }) {
  if (entry.foodId !== null) return <EditLinkedEntry entry={entry} foodId={entry.foodId} onDone={onDone} />;

  const recipe = entry.recipeId === null ? undefined : recipes.find((candidate) => candidate.id === entry.recipeId);
  const asFood = recipe ? recipeAsFood(recipe) : null;
  return (
    <EditEntryForm
      entry={entry}
      food={asFood?.ok ? asFood.food : null}
      unavailableNote={asFood && !asFood.ok ? recipeProblemMessage(asFood.error) : undefined}
      onDone={onDone}
    />
  );
}
