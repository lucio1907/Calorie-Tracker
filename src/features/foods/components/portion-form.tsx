import { Button, TextField } from "@/components/ui";
import type { PortionFormState } from "../lib/form-state";
import { foodsStrings } from "../strings";

const t = foodsStrings.portions;

type PortionFormProps = {
  state: PortionFormState;
  action?: (formData: FormData) => void;
  pending?: boolean;
  /** Hidden fields identifying the food (add) or the portion (edit). */
  hidden: Record<string, string | number>;
  defaults?: { label: string; grams: string };
  submitLabel: string;
  pendingLabel: string;
  onCancel?: () => void;
};

/** Label + grams form used to add a portion or edit one in place. */
export function PortionForm({
  state,
  action,
  pending = false,
  hidden,
  defaults,
  submitLabel,
  pendingLabel,
  onCancel,
}: PortionFormProps) {
  const failed = state.status === "error";
  return (
    <form action={action} noValidate className="flex flex-col gap-8" aria-busy={pending || undefined}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <fieldset disabled={pending} className="grid grid-cols-[1fr_112px] items-start gap-8">
        <TextField
          label={t.labelField}
          name="label"
          placeholder={t.labelPlaceholder}
          maxLength={100}
          autoComplete="off"
          required
          defaultValue={failed ? state.values.label : defaults?.label}
          error={state.fieldErrors.label}
        />
        <TextField
          label={t.gramsField}
          name="grams"
          inputMode="decimal"
          autoComplete="off"
          required
          defaultValue={failed ? state.values.grams : defaults?.grams}
          error={state.fieldErrors.grams}
          className="[&_input]:tabular"
        />
      </fieldset>
      {state.formError ? (
        <p role="alert" className="text-body text-danger-ink">
          {state.formError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-8">
        <Button type="submit" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            {t.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
