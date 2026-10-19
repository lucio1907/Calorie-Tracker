"use client";

import { useState, type ReactNode } from "react";
import { Button, DatePicker, TextField } from "@/components/ui";
import type { CalendarDate } from "@/domain";
import { MIN_DIARY_DATE } from "@/features/diary/lib/diary-date";
import type { WeightEntryFormState } from "../lib/types";
import { progressStrings } from "../strings";

const t = progressStrings.form;

type WeightEntryFormProps = {
  defaultDate: CalendarDate;
  defaultKg: string;
  /** Latest selectable day (today in the app time zone); the server checks it again. */
  today: CalendarDate;
  /** Hidden fields (entryId when editing). */
  hidden?: Record<string, string>;
  submitLabel: string;
  /** Hint under the weight field. */
  hint?: string;
  state: WeightEntryFormState;
  action?: (formData: FormData) => void;
  pending?: boolean;
  /** Extra controls under the form (e.g. delete). */
  footer?: ReactNode;
};

/** Date + weight form, used to log a new weight and to edit one. */
export function WeightEntryForm({
  defaultDate,
  defaultKg,
  today,
  hidden = {},
  submitLabel,
  hint,
  state,
  action,
  pending = false,
  footer,
}: WeightEntryFormProps) {
  const [date, setDate] = useState(state.values.date ?? defaultDate);

  return (
    <div className="flex flex-col gap-24">
      <form action={action} noValidate className="flex flex-col gap-16" aria-busy={pending || undefined}>
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        {state.formError ? (
          <p role="alert" className="rounded-inputs bg-danger-wash px-12 py-8 text-body text-danger-ink">
            {state.formError}
          </p>
        ) : null}

        <fieldset disabled={pending} className="flex flex-col gap-16">
          <DatePicker
            label={t.date}
            name="date"
            value={date}
            onChange={setDate}
            min={MIN_DIARY_DATE}
            max={today}
            required
            disabled={pending}
            error={state.fieldErrors.date}
          />
          <TextField
            label={t.kg}
            name="kg"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            required
            defaultValue={state.values.kg ?? defaultKg}
            hint={hint}
            error={state.fieldErrors.kg}
            className="max-w-320 [&_input]:tabular"
          />
          <div>
            <Button type="submit" variant="primary">
              {pending ? t.saving : submitLabel}
            </Button>
          </div>
        </fieldset>
      </form>
      {footer}
    </div>
  );
}
