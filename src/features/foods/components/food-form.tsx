import { Button, TextField } from "@/components/ui";
import type { FoodFieldName, FoodFormValues } from "../lib/food-schema";
import type { FoodFormState } from "../lib/form-state";
import { foodsStrings } from "../strings";

const t = foodsStrings.form;

type FoodFormProps = {
  state: FoodFormState;
  action?: (formData: FormData) => void;
  pending?: boolean;
  /** Initial values when editing; ignored after a failed submit (the typed values win). */
  defaults?: FoodFormValues;
  foodId?: number;
  onCancel: () => void;
};

const NUMBER_FIELDS: Array<{ name: FoodFieldName; label: string; required: boolean }> = [
  { name: "kcal", label: t.kcal, required: true },
  { name: "protein", label: t.protein, required: true },
  { name: "carbs", label: t.carbs, required: true },
  { name: "fat", label: t.fat, required: true },
  { name: "fiber", label: t.fiber, required: false },
  { name: "sodiumMg", label: t.sodium, required: false },
];

/** Create / edit a custom food. Values per 100 g; decimal comma or point accepted. */
export function FoodForm({ state, action, pending = false, defaults, foodId, onCancel }: FoodFormProps) {
  const values = state.status === "error" ? state.values : (defaults ?? {});
  const errors = state.fieldErrors;

  return (
    <form action={action} noValidate className="flex flex-col gap-16" aria-busy={pending || undefined}>
      {foodId ? <input type="hidden" name="foodId" value={foodId} /> : null}
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
          defaultValue={values.name}
          error={errors.name}
        />
        <TextField
          label={t.brand}
          hint={t.brandHint}
          name="brand"
          maxLength={200}
          autoComplete="off"
          defaultValue={values.brand}
          error={errors.brand}
        />
        <TextField
          label={t.barcode}
          hint={t.barcodeHint}
          name="barcode"
          inputMode="numeric"
          maxLength={20}
          autoComplete="off"
          defaultValue={values.barcode}
          error={errors.barcode}
          className="[&_input]:tabular"
        />
      </fieldset>

      <fieldset disabled={pending} className="flex flex-col gap-12">
        <legend className="mb-12 text-body font-semibold text-ink">{t.per100}</legend>
        <div className="grid grid-cols-2 gap-12">
          {NUMBER_FIELDS.map((field) => (
            <TextField
              key={field.name}
              label={field.label}
              hint={field.required ? undefined : t.optional}
              name={field.name}
              inputMode="decimal"
              autoComplete="off"
              required={field.required}
              defaultValue={values[field.name]}
              error={errors[field.name]}
              className="[&_input]:tabular"
            />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-8">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? t.saving : t.save}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
