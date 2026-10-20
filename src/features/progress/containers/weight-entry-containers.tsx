"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { CalendarDate } from "@/domain";
import { formatDiaryDate } from "@/features/diary/lib/diary-date";
import { deleteWeightEntry, saveWeightEntry, updateWeightEntry } from "../actions/weight-actions";
import { WeightEntryForm } from "../components/weight-entry-form";
import { formatKg } from "../lib/format";
import { initialWeightEntryFormState, type WeightEntry, type WeightEntryFormState } from "../lib/types";
import { progressStrings } from "../strings";

const t = progressStrings.form;

type AddWeightContainerProps = {
  today: CalendarDate;
  /** Prefill: the latest logged weight, so a small change is a quick edit. */
  defaultKg: string;
  onSaved: () => void;
};

/** "Log weight": a date (today by default) and kg, saved with saveWeightEntry. */
export function AddWeightContainer({ today, defaultKg, onSaved }: AddWeightContainerProps) {
  const [state, formAction, pending] = useActionState(async (previous: WeightEntryFormState, formData: FormData) => {
    const next = await saveWeightEntry(previous, formData);
    if (next.status === "saved") onSaved();
    return next;
  }, initialWeightEntryFormState);

  return (
    <WeightEntryForm
      defaultDate={today}
      defaultKg={defaultKg}
      today={today}
      submitLabel={t.save}
      hint={t.kgHint}
      state={state}
      action={formAction}
      pending={pending}
    />
  );
}

function DeleteWeightControl({
  entry,
  today,
  onDeleted,
}: {
  entry: WeightEntry;
  today: CalendarDate;
  onDeleted: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "confirming">("idle");
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  function confirm() {
    setError(null);
    startDelete(async () => {
      const result = await deleteWeightEntry(entry.id);
      if (result.ok) onDeleted();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-8 border-t border-border pt-16">
      {phase === "idle" ? (
        <div>
          <Button variant="danger" onClick={() => setPhase("confirming")}>
            {t.delete}
          </Button>
        </div>
      ) : (
        <div role="group" aria-labelledby="delete-weight-question" className="flex flex-col gap-8">
          <p id="delete-weight-question" className="text-body text-ink">
            {t.confirmDelete(formatDiaryDate(entry.date, today))}
          </p>
          <div className="flex flex-wrap gap-8">
            <Button variant="danger" onClick={confirm} disabled={deleting}>
              {deleting ? t.deleting : t.confirmDeleteAction}
            </Button>
            <Button onClick={() => setPhase("idle")} disabled={deleting}>
              {t.cancel}
            </Button>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-body text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type EditWeightContainerProps = {
  entry: WeightEntry;
  today: CalendarDate;
  onDone: () => void;
};

/** Edit an entry's date and weight with updateWeightEntry, or delete it. */
export function EditWeightContainer({ entry, today, onDone }: EditWeightContainerProps) {
  const [state, formAction, pending] = useActionState(async (previous: WeightEntryFormState, formData: FormData) => {
    const next = await updateWeightEntry(previous, formData);
    if (next.status === "saved") onDone();
    return next;
  }, initialWeightEntryFormState);

  return (
    <WeightEntryForm
      defaultDate={entry.date}
      defaultKg={formatKg(entry.kg)}
      today={today}
      hidden={{ entryId: String(entry.id) }}
      submitLabel={t.update}
      state={state}
      action={formAction}
      pending={pending}
      footer={<DeleteWeightControl entry={entry} today={today} onDeleted={onDone} />}
    />
  );
}
