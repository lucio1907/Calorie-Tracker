import { ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui";
import type { BarcodeLookupState } from "../lib/form-state";
import { foodsStrings } from "../strings";

const t = foodsStrings.barcode;

type BarcodeFormProps = {
  state: BarcodeLookupState;
  action?: (formData: FormData) => void;
  pending?: boolean;
};

/** Manual barcode entry. Camera scanning will feed the same action later. */
export function BarcodeForm({ state, action, pending = false }: BarcodeFormProps) {
  const error = state.status === "error" ? state.error : null;
  return (
    <form action={action} noValidate className="flex flex-col gap-4" aria-busy={pending || undefined}>
      <label htmlFor="barcode-lookup" className="text-body font-medium text-ink">
        {t.label}
      </label>
      <div className="flex gap-8">
        <div className="relative min-w-0 flex-1">
          <ScanBarcode
            aria-hidden="true"
            size={18}
            className="pointer-events-none absolute top-1/2 left-12 -translate-y-1/2 text-ink-subtle"
          />
          <input
            id="barcode-lookup"
            name="barcode"
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="search"
            maxLength={20}
            required
            defaultValue={state.status === "error" ? state.barcode : ""}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "barcode-lookup-hint barcode-lookup-error" : "barcode-lookup-hint"}
            disabled={pending}
            className={`tabular min-h-44 w-full rounded-inputs border bg-surface py-8 pr-12 pl-40 text-body-lg text-input-text ${error ? "border-danger-ink" : "border-input-border"}`}
          />
        </div>
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? t.submitting : t.submit}
        </Button>
      </div>
      <p id="barcode-lookup-hint" className="text-caption text-ink-muted">
        {t.hint}
      </p>
      <p id="barcode-lookup-error" role="alert" className="text-body text-danger-ink empty:hidden">
        {error ?? ""}
      </p>
    </form>
  );
}
