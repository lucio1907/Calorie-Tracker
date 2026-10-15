"use client";

import { useState, type ReactNode } from "react";
import { Button, Select, TextField } from "@/components/ui";
import { MAX_ENTRY_GRAMS, MEALS, type Meal, type Nutrients } from "@/domain";
import { formatAmount, formatKcal } from "@/features/foods/lib/format";
import { GRAMS_UNIT, type PortionOption } from "../lib/entry-amount";
import { previewEntry, type EntryPreview } from "../lib/entry-preview";
import type { EntryFormState } from "../lib/types";
import { diaryStrings } from "../strings";
import { MacroLine } from "./macro-line";

const t = diaryStrings;

const MEAL_OPTIONS = MEALS.map((meal) => ({ value: meal, label: t.meals[meal] }));

/** A food's per-100 g nutrients and portions, as the form needs them. */
export type EntryFormFood = Nutrients & { name: string; portions: readonly PortionOption[] };

export type EntryFormDefaults = { meal: Meal; unit: string; amount: string };

type EntryFormProps = {
  /** The food to log; null when it was deleted (only the meal can change). */
  food: EntryFormFood | null;
  /** Heading above the fields (the food name, or the entry label). */
  title: string;
  defaults: EntryFormDefaults;
  /** Shown when `food` is null: what the entry logged. */
  logged?: EntryPreview;
  /** Hidden ids (date + foodId to create, entryId to edit). */
  hidden: Record<string, string>;
  submitLabel: string;
  state: EntryFormState;
  action?: (formData: FormData) => void;
  pending?: boolean;
  onCancel?: () => void;
  cancelLabel?: string;
  /** Extra controls under the form (e.g. delete). */
  footer?: ReactNode;
};

/** The food's portions, then grams. */
function unitOptions(portions: readonly PortionOption[]) {
  return [
    ...portions.map((portion) => ({
      value: String(portion.id),
      label: t.units.portionOption(portion.label, formatAmount(portion.grams)),
    })),
    { value: GRAMS_UNIT, label: t.units.gramsOption },
  ];
}

function PreviewPanel({ preview }: { preview: EntryPreview | null }) {
  return (
    <section aria-labelledby="entry-preview-heading" className="rounded-cards bg-surface-muted p-12">
      <h3 id="entry-preview-heading" className="text-caption font-semibold tracking-wide text-ink-muted uppercase">
        {t.entryForm.previewHeading}
      </h3>
      <output aria-live="polite" className="mt-4 flex flex-col gap-4">
        {preview ? (
          <>
            <span className="flex items-baseline gap-8">
              <span className="tabular text-heading-sm text-ink">{formatKcal(preview.nutrients.kcal)}</span>
              <span className="text-body text-ink-muted">{t.nutrients.kcal}</span>
              <span className="tabular text-body text-ink-muted">· {t.units.grams(formatAmount(preview.grams))}</span>
            </span>
            <MacroLine nutrients={preview.nutrients} className="text-body text-ink" />
          </>
        ) : (
          <span className="text-body text-ink-muted">{t.entryForm.previewEmpty}</span>
        )}
      </output>
    </section>
  );
}

/**
 * Add / edit form for one entry: meal, unit (grams or a portion) and amount,
 * with a live preview computed with the same rules the server uses to store
 * the snapshot.
 */
export function EntryForm({
  food,
  title,
  defaults,
  logged,
  hidden,
  submitLabel,
  state,
  action,
  pending = false,
  onCancel,
  cancelLabel,
  footer,
}: EntryFormProps) {
  const [meal, setMeal] = useState<string>(defaults.meal);
  const [unit, setUnit] = useState(defaults.unit);
  const [amount, setAmount] = useState(defaults.amount);
  const errors = state.fieldErrors;

  const preview = food ? previewEntry(food, unit, amount) : (logged ?? null);
  const isGrams = unit === GRAMS_UNIT;

  function changeUnit(next: string) {
    // Keep the same food amount when switching to grams; start at 1 portion otherwise.
    if (next === GRAMS_UNIT) setAmount(preview ? String(preview.grams) : amount);
    else if (isGrams) setAmount("1");
    setUnit(next);
  }

  return (
    <div className="flex flex-col gap-24">
      <form action={action} noValidate className="flex flex-col gap-16" aria-busy={pending || undefined}>
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        <div className="flex flex-col gap-4">
          <p className="text-body-lg font-semibold text-ink">{title}</p>
          {food ? (
            <p className="text-caption text-ink-muted">{t.entryForm.perHundred(formatKcal(food.kcal))}</p>
          ) : (
            <p className="text-body text-ink-muted">{t.entryForm.foodDeleted}</p>
          )}
        </div>

        {state.formError ? (
          <p role="alert" className="rounded-inputs bg-danger-wash px-12 py-8 text-body text-danger-ink">
            {state.formError}
          </p>
        ) : null}

        <fieldset disabled={pending} className="flex flex-col gap-16">
          <Select label={t.entryForm.meal} name="meal" options={MEAL_OPTIONS} value={meal} onChange={setMeal} error={errors.meal} />

          {food ? (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-12">
              <Select
                label={t.entryForm.unit}
                name="unit"
                options={unitOptions(food.portions)}
                value={unit}
                onChange={changeUnit}
                error={errors.unit}
              />
              <TextField
                label={isGrams ? t.entryForm.grams : t.entryForm.quantity}
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                enterKeyHint="done"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                hint={isGrams ? t.entryForm.gramsHint(MAX_ENTRY_GRAMS) : undefined}
                error={errors.amount}
                className="tabular"
              />
            </div>
          ) : null}

          <PreviewPanel preview={preview} />

          <div className="flex flex-wrap gap-8">
            <Button type="submit" variant="primary">
              {pending ? t.entryForm.saving : submitLabel}
            </Button>
            {onCancel && cancelLabel ? <Button onClick={onCancel}>{cancelLabel}</Button> : null}
          </div>
        </fieldset>
      </form>
      {footer}
    </div>
  );
}
