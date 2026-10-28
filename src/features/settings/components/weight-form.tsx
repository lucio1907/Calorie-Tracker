import { Button, TextField } from "@/components/ui";
import type { WeightFormState } from "../lib/types";
import { settingsStrings } from "../strings";

const w = settingsStrings.weight;

type WeightFormProps = {
  state: WeightFormState;
  /** The latest logged weight as input text ("78,5"); empty before any weight. */
  latestKg?: string;
  action?: (formData: FormData) => void;
  pending?: boolean;
};

/** Logs today's weight. The date is set on the server (today in the app time zone). */
export function WeightForm({ state, latestKg = "", action, pending = false }: WeightFormProps) {
  return (
    <form action={action} noValidate className="flex flex-col gap-12" aria-busy={pending || undefined}>
      {state.formError ? (
        <p role="alert" className="rounded-inputs bg-danger-wash px-12 py-8 text-body text-danger-ink">
          {state.formError}
        </p>
      ) : null}
      <fieldset disabled={pending} className="flex flex-col items-start gap-12">
        <TextField
          label={w.kg}
          name="kg"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          required
          hint={w.hint}
          defaultValue={state.status === "error" ? state.value : latestKg}
          error={state.fieldError ?? undefined}
          className="w-full max-w-320 [&_input]:tabular"
        />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? w.saving : w.save}
        </Button>
      </fieldset>
      <p role="status" className="text-body text-ink-muted">
        {state.status === "saved" && !pending ? w.saved : null}
      </p>
    </form>
  );
}
