import { Button, TextField } from "@/components/ui";
import type { VerifyState } from "../lib/second-factor";
import { authStrings } from "../strings";

type VerifyFormProps = {
  state: VerifyState;
  action?: (formData: FormData) => void;
  pending?: boolean;
  next?: string;
  disabled?: boolean;
};

/** Presentational second-factor form. State and submission come from the container. */
export function VerifyForm({ state, action, pending = false, next, disabled = false }: VerifyFormProps) {
  const inert = disabled || pending;

  return (
    <form action={action} noValidate className="flex flex-col gap-16" aria-busy={pending || undefined}>
      {state.formError ? (
        <p role="alert" className="rounded-inputs bg-danger-wash px-12 py-8 text-body text-danger-ink">
          {state.formError}
        </p>
      ) : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <fieldset disabled={inert} className="flex flex-col gap-16">
        <TextField
          label={authStrings.codeLabel}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          enterKeyHint="done"
          maxLength={7}
          required
          error={state.fieldError ?? undefined}
          className="[&_input]:tabular"
        />
      </fieldset>
      <Button type="submit" variant="primary" disabled={inert} className="w-full">
        {pending ? authStrings.verifySubmitting : authStrings.verifySubmit}
      </Button>
    </form>
  );
}
