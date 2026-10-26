import { Plus, X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Button, cn, formActionProps, TextField } from "@/components/ui";
import { formatAmount, formatKcal } from "@/features/foods/lib/format";
import { foodsStrings } from "@/features/foods/strings";
import type { RecipeNutrition } from "../lib/recipe-nutrition";
import type { RecipeFormState } from "../lib/types";
import { recipesStrings } from "../strings";

const t = recipesStrings.form;
const n = foodsStrings.nutrients;

/** One ingredient row as edited: grams is the text typed. */
export type IngredientDraft = {
  key: string;
  foodId: number;
  name: string | null;
  grams: string;
};

type RecipeFormProps = {
  recipeId?: number;
  defaults: { name: string; notes: string };
  servings: string;
  onServingsChange: (servings: string) => void;
  ingredients: IngredientDraft[];
  onGramsChange: (key: string, grams: string) => void;
  onRemove: (key: string) => void;
  /** The ingredient search, when open. */
  picker: ReactNode;
  onTogglePicker: () => void;
  pickerOpen: boolean;
  /** Live values for the typed amounts; null while incomplete. */
  summary: RecipeNutrition | null;
  state: RecipeFormState;
  action?: (formData: FormData) => void;
  pending?: boolean;
  onCancel: () => void;
};

function Summary({ summary }: { summary: RecipeNutrition | null }) {
  return (
    <section aria-labelledby="recipe-summary-heading" className="rounded-cards bg-surface-muted p-12">
      <h3 id="recipe-summary-heading" className="text-caption font-semibold tracking-wide text-ink-muted uppercase">
        {t.summaryHeading}
      </h3>
      <output aria-live="polite" className="mt-4 flex flex-col gap-4">
        {summary ? (
          <>
            <span className="flex items-baseline gap-8">
              <span className="tabular text-heading-sm text-ink">{formatKcal(summary.perServing.kcal)}</span>
              <span className="text-body text-ink-muted">{n.kcalUnit}</span>
            </span>
            <span className="tabular text-body text-ink">
              {n.short.protein} {formatAmount(summary.perServing.protein)} · {n.short.carbs}{" "}
              {formatAmount(summary.perServing.carbs)} · {n.short.fat} {formatAmount(summary.perServing.fat)}
            </span>
            <span className="tabular text-caption text-ink-muted">
              {t.summaryTotal(formatAmount(summary.totalGrams), formatAmount(summary.servingGrams))}
            </span>
          </>
        ) : (
          <span className="text-body text-ink-muted">{t.summaryEmpty}</span>
        )}
      </output>
    </section>
  );
}

/** Create / edit a recipe: name, servings, notes and ingredients (food + grams). */
export function RecipeForm({
  recipeId,
  defaults,
  servings,
  onServingsChange,
  ingredients,
  onGramsChange,
  onRemove,
  picker,
  onTogglePicker,
  pickerOpen,
  summary,
  state,
  action,
  pending = false,
  onCancel,
}: RecipeFormProps) {
  const formId = useId();
  const notesId = useId();
  const errors = state.fieldErrors;

  // The ingredient search sits outside the <form> so Enter in it never submits
  // the recipe; the buttons below reach the form through their form attribute.
  return (
    <div className="flex flex-col gap-16">
      <form id={formId} {...formActionProps(action)} noValidate className="flex flex-col gap-16" aria-busy={pending || undefined}>
        {recipeId ? <input type="hidden" name="recipeId" value={recipeId} /> : null}
        {state.formError ? (
          <p role="alert" className="rounded-inputs bg-danger-wash px-12 py-8 text-body text-danger-ink">
            {state.formError}
          </p>
        ) : null}

        <fieldset disabled={pending} className="flex flex-col gap-16">
          <TextField
            label={t.name}
            name="name"
            required
            maxLength={200}
            autoComplete="off"
            defaultValue={defaults.name}
            error={errors.name}
          />
          <TextField
            label={t.servings}
            hint={t.servingsHint}
            name="servings"
            inputMode="decimal"
            autoComplete="off"
            required
            value={servings}
            onChange={(event) => onServingsChange(event.target.value)}
            error={errors.servings}
            className="[&_input]:tabular"
          />
          <div className="flex flex-col gap-4">
            <label htmlFor={notesId} className="text-body font-medium text-ink">
              {t.notes}
            </label>
            <textarea
              id={notesId}
              name="notes"
              rows={3}
              maxLength={2000}
              defaultValue={defaults.notes}
              aria-invalid={errors.notes ? true : undefined}
              aria-describedby={`${notesId}-hint${errors.notes ? ` ${notesId}-error` : ""}`}
              className={cn(
                "rounded-inputs border bg-surface px-12 py-8 text-body-lg text-input-text",
                errors.notes ? "border-danger-ink" : "border-input-border",
              )}
            />
            <p id={`${notesId}-hint`} className="text-caption text-ink-muted">
              {t.notesHint}
            </p>
            {errors.notes ? (
              <p id={`${notesId}-error`} className="text-body text-danger-ink">
                {errors.notes}
              </p>
            ) : null}
          </div>
        </fieldset>

        <fieldset disabled={pending} className="flex flex-col gap-12">
          <legend className="mb-12 text-body font-semibold text-ink">{t.ingredients}</legend>
          {ingredients.length === 0 ? <p className="text-body text-ink-muted">{t.noIngredients}</p> : null}
          <ul className="flex flex-col gap-12">
            {ingredients.map((ingredient, index) => {
              const name = ingredient.name ?? t.missingFood;
              return (
                <li key={ingredient.key} className="flex items-end gap-8">
                    <input type="hidden" name="foodId" value={ingredient.foodId} />
                  <TextField
                    label={t.ingredientGrams(name)}
                    name="grams"
                    inputMode="decimal"
                    autoComplete="off"
                    required
                    value={ingredient.grams}
                    onChange={(event) => onGramsChange(ingredient.key, event.target.value)}
                    error={state.itemErrors[index]}
                    className="min-w-0 flex-1 [&_input]:tabular"
                  />
                  <Button variant="ghost" aria-label={t.removeIngredient(name)} onClick={() => onRemove(ingredient.key)} className="px-12">
                    <X aria-hidden="true" size={18} />
                  </Button>
                </li>
              );
            })}
          </ul>
          {errors.items ? (
            <p role="alert" className="text-body text-danger-ink">
              {errors.items}
            </p>
          ) : null}
          <div>
            <Button onClick={onTogglePicker} aria-expanded={pickerOpen}>
              {pickerOpen ? null : <Plus aria-hidden="true" size={18} />}
              <span>{pickerOpen ? t.hideSearch : t.addIngredient}</span>
            </Button>
          </div>
        </fieldset>
      </form>
      {picker}

      <Summary summary={summary} />

      <div className="flex flex-wrap gap-8">
        <Button type="submit" form={formId} variant="primary" disabled={pending}>
          {pending ? t.saving : t.save}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          {t.cancel}
        </Button>
      </div>
    </div>
  );
}
