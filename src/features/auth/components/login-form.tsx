import { Button, TextField } from "@/components/ui";
import type { SignInState } from "../lib/sign-in-state";
import { authStrings } from "../strings";

type LoginFormProps = {
  state: SignInState;
  action?: (formData: FormData) => void;
  pending?: boolean;
  next?: string;
  disabled?: boolean;
};

/** Presentational sign-in form. State and submission come from the container. */
export function LoginForm({ state, action, pending = false, next, disabled = false }: LoginFormProps) {
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
          label={authStrings.emailLabel}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.email}
          error={state.fieldErrors.email}
        />
        <TextField
          label={authStrings.passwordLabel}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={state.fieldErrors.password}
        />
      </fieldset>
      <Button type="submit" variant="primary" disabled={inert} className="w-full">
        {pending ? authStrings.submitting : authStrings.submit}
      </Button>
    </form>
  );
}
