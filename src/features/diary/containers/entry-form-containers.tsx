"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { CalendarDate, Meal } from "@/domain";
import { useFoodDetail } from "@/features/foods/hooks/use-food-detail";
import type { FoodDetail } from "@/features/foods/lib/types";
import { createEntry, deleteEntry, updateEntry } from "../actions/entry-actions";
import { EntryForm, type EntryFormDefaults } from "../components/entry-form";
import { GRAMS_UNIT } from "../lib/entry-amount";
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

/** Start with one portion when the food has any, otherwise 100 g. */
function createDefaults(food: FoodDetail, meal: Meal): EntryFormDefaults {
  const first = food.portions[0];
  return first ? { meal, unit: String(first.id), amount: "1" } : { meal, unit: GRAMS_UNIT, amount: "100" };
}

/** Restore how the entry was logged; fall back to grams when its portion is gone. */
function editDefaults(entry: DiaryEntry, food: FoodDetail | null): EntryFormDefaults {
  const portion =
    entry.quantity !== null && entry.portionLabel !== null
      ? food?.portions.find((candidate) => candidate.label === entry.portionLabel)
      : undefined;
  return portion && entry.quantity !== null
    ? { meal: entry.meal, unit: String(portion.id), amount: String(entry.quantity) }
    : { meal: entry.meal, unit: GRAMS_UNIT, amount: String(entry.grams) };
}

type AddEntryContainerProps = {
  foodId: number;
  meal: Meal;
  date: CalendarDate;
  onSaved: () => void;
  onBack: () => void;
};

/** Second step of "add food": amount for the picked food, saved with createEntry. */
export function AddEntryContainer({ foodId, meal, date, onSaved, onBack }: AddEntryContainerProps) {
  const { food, status, reload } = useFoodDetail(foodId);
  const [state, formAction, pending] = useActionState(async (previous: EntryFormState, formData: FormData) => {
    const next = await createEntry(previous, formData);
    if (next.status === "saved") onSaved();
    return next;
  }, initialEntryFormState);

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

function EditEntryForm({ entry, food, onDone }: EditEntryContainerProps & { food: FoodDetail | null }) {
  const [state, formAction, pending] = useActionState(async (previous: EntryFormState, formData: FormData) => {
    const next = await updateEntry(previous, formData);
    if (next.status === "saved") onDone();
    return next;
  }, initialEntryFormState);

  return (
    <EntryForm
      food={food}
      title={entry.label}
      defaults={editDefaults(entry, food)}
      logged={{ grams: entry.grams, nutrients: entry }}
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
  return <EditEntryForm entry={entry} food={food} onDone={onDone} />;
}

/** Edit an entry's meal and amount, or delete it. */
export function EditEntryContainer({ entry, onDone }: EditEntryContainerProps) {
  return entry.foodId === null ? (
    <EditEntryForm entry={entry} food={null} onDone={onDone} />
  ) : (
    <EditLinkedEntry entry={entry} foodId={entry.foodId} onDone={onDone} />
  );
}
