"use client";

import { useState, type ReactNode } from "react";
import { Button, ButtonLink, TextField } from "@/components/ui";
import { formatAmount, formatKcal } from "@/features/foods/lib/format";
import { activityKcal } from "../lib/activity-kcal";
import { MAX_ACTIVITY_MINUTES, parseMinutes } from "../lib/activity-schema";
import type { ActivityFormState } from "../lib/types";
import { activityStrings } from "../strings";

const t = activityStrings;

/** kcal for the typed duration, computed with the same function the server uses; null while invalid. */
export function previewActivityKcal(met: number, weightKg: number, minutesText: string): number | null {
  const minutes = parseMinutes(minutesText);
  if (!minutes.ok) return null;
  const kcal = activityKcal(met, weightKg, minutes.value);
  return kcal.ok ? kcal.kcal : null;
}

type ActivityEntryFormProps = {
  /** Heading above the field (the activity name). */
  title: string;
  /** MET and weight for the live preview; the server recomputes on save. */
  met: number;
  weightKg: number;
  defaultMinutes: string;
  /** Hidden ids (date + activityId to create, entryId to edit). */
  hidden: Record<string, string>;
  submitLabel: string;
  state: ActivityFormState;
  action?: (formData: FormData) => void;
  pending?: boolean;
  onCancel?: () => void;
  cancelLabel?: string;
  /** Extra controls under the form (e.g. delete). */
  footer?: ReactNode;
};

/** Duration form for one activity, with a live kcal preview ((MET - 1) x weight x hours). */
export function ActivityEntryForm({
  title,
  met,
  weightKg,
  defaultMinutes,
  hidden,
  submitLabel,
  state,
  action,
  pending = false,
  onCancel,
  cancelLabel,
  footer,
}: ActivityEntryFormProps) {
  const [minutes, setMinutes] = useState(state.values.minutes ?? defaultMinutes);
  const preview = previewActivityKcal(met, weightKg, minutes);

  return (
    <div className="flex flex-col gap-24">
      <form action={action} noValidate className="flex flex-col gap-16" aria-busy={pending || undefined}>
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        <div className="flex flex-col gap-4">
          <p className="text-body-lg font-semibold text-ink">{title}</p>
          <p className="text-caption text-ink-muted">{t.form.previewBasis(formatAmount(met), formatAmount(weightKg))}</p>
        </div>

        {state.formError ? (
          <div role="alert" className="flex flex-col items-start gap-8 rounded-inputs bg-danger-wash px-12 py-8">
            <p className="text-body text-danger-ink">{state.formError}</p>
            {state.needsWeight ? <ButtonLink href="/settings">{t.weight.missingAction}</ButtonLink> : null}
          </div>
        ) : null}

        <fieldset disabled={pending} className="flex flex-col gap-16">
          <TextField
            label={t.form.minutes}
            name="minutes"
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="done"
            required
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            hint={t.form.minutesHint(MAX_ACTIVITY_MINUTES)}
            error={state.fieldErrors.minutes}
            className="tabular"
          />

          <section aria-labelledby="activity-preview-heading" className="rounded-cards bg-surface-muted p-12">
            <h3
              id="activity-preview-heading"
              className="text-caption font-semibold tracking-wide text-ink-muted uppercase"
            >
              {t.form.previewHeading}
            </h3>
            <output aria-live="polite" className="mt-4 flex items-baseline gap-8">
              {preview !== null ? (
                <>
                  <span className="tabular text-heading-sm text-ink">{formatKcal(preview)}</span>
                  <span className="text-body text-ink-muted">{t.units.kcal}</span>
                </>
              ) : (
                <span className="text-body text-ink-muted">{t.form.previewEmpty}</span>
              )}
            </output>
          </section>

          <div className="flex flex-wrap gap-8">
            <Button type="submit" variant="primary">
              {pending ? t.form.saving : submitLabel}
            </Button>
            {onCancel && cancelLabel ? <Button onClick={onCancel}>{cancelLabel}</Button> : null}
          </div>
        </fieldset>
      </form>
      {footer}
    </div>
  );
}
