import { Button, TextField } from "@/components/ui";
import type { TwoFactorDisableState, TwoFactorEnrollState } from "../lib/types";
import { settingsStrings } from "../strings";

const f = settingsStrings.twoFactor;

function FormError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="rounded-inputs bg-danger-wash px-12 py-8 text-body text-danger-ink">
      {message}
    </p>
  ) : null;
}

type EnrollFormProps = {
  state: TwoFactorEnrollState;
  action?: (formData: FormData) => void;
  pending?: boolean;
};

/** Turns two-factor authentication on: a start button, then the QR code, the setup key and a code field. */
export function TwoFactorEnrollForm({ state, action, pending = false }: EnrollFormProps) {
  if (state.status === "idle") {
    return (
      <form action={action} className="flex flex-col items-start gap-12" aria-busy={pending || undefined}>
        <FormError message={state.formError} />
        <Button type="submit" disabled={pending}>
          {pending ? f.starting : f.start}
        </Button>
      </form>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-12" aria-busy={pending || undefined}>
      <FormError message={state.formError} />
      <p className="text-body text-ink">{f.scan}</p>
      {/* Auth returns the QR code as an SVG data URI; next/image adds nothing for it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={state.qrCode} alt={f.qrAlt} width={180} height={180} className="rounded-inputs border border-border bg-surface" />
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-muted">{f.secretLabel}</p>
        <code className="text-body break-all text-ink select-all">{state.secret}</code>
      </div>
      <fieldset disabled={pending} className="flex flex-col items-start gap-12">
        <TextField
          label={f.code}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          enterKeyHint="done"
          maxLength={7}
          required
          error={state.fieldError ?? undefined}
          className="w-full max-w-320 [&_input]:tabular"
        />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? f.confirming : f.confirm}
        </Button>
      </fieldset>
    </form>
  );
}

type DisableFormProps = {
  factorId: string;
  state: TwoFactorDisableState;
  action?: (formData: FormData) => void;
  pending?: boolean;
};

/** Turns two-factor authentication off. */
export function TwoFactorDisableForm({ factorId, state, action, pending = false }: DisableFormProps) {
  return (
    <form action={action} className="flex flex-col items-start gap-12" aria-busy={pending || undefined}>
      <FormError message={state.formError} />
      <input type="hidden" name="factorId" value={factorId} />
      <Button type="submit" disabled={pending}>
        {pending ? f.disabling : f.disable}
      </Button>
    </form>
  );
}
