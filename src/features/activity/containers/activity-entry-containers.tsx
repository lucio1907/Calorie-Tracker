"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { CalendarDate } from "@/domain";
import { formatAmount } from "@/features/foods/lib/format";
import { createActivityEntry, deleteActivityEntry, updateActivityEntry } from "../actions/activity-actions";
import { ActivityEntryForm } from "../components/activity-entry-form";
import {
  initialActivityFormState,
  type ActivityEntry,
  type ActivityFormState,
  type ActivityWeight,
  type CatalogActivity,
} from "../lib/types";
import { activityStrings } from "../strings";

const t = activityStrings;

/** Start with half an hour. */
const DEFAULT_MINUTES = "30";

type AddActivityContainerProps = {
  activity: CatalogActivity;
  date: CalendarDate;
  weight: ActivityWeight;
  onSaved: () => void;
  onBack: () => void;
};

/** Second step of "log activity": duration for the picked activity, saved with createActivityEntry. */
export function AddActivityContainer({ activity, date, weight, onSaved, onBack }: AddActivityContainerProps) {
  const [state, formAction, pending] = useActionState(async (previous: ActivityFormState, formData: FormData) => {
    const next = await createActivityEntry(previous, formData);
    if (next.status === "saved") onSaved();
    return next;
  }, initialActivityFormState);

  return (
    <ActivityEntryForm
      title={activity.name}
      met={activity.met}
      weightKg={weight.kg}
      defaultMinutes={DEFAULT_MINUTES}
      hidden={{ date, activityId: String(activity.id) }}
      submitLabel={t.form.save}
      state={state}
      action={formAction}
      pending={pending}
      onCancel={onBack}
      cancelLabel={t.add.back}
    />
  );
}

function DeleteActivityControl({ entry, onDeleted }: { entry: ActivityEntry; onDeleted: () => void }) {
  const [phase, setPhase] = useState<"idle" | "confirming">("idle");
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  function confirm() {
    setError(null);
    startDelete(async () => {
      const result = await deleteActivityEntry(entry.id);
      if (result.ok) onDeleted();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-8 border-t border-border pt-16">
      {phase === "idle" ? (
        <div>
          <Button variant="danger" onClick={() => setPhase("confirming")}>
            {t.edit.delete}
          </Button>
        </div>
      ) : (
        <div role="group" aria-labelledby="delete-activity-question" className="flex flex-col gap-8">
          <p id="delete-activity-question" className="text-body text-ink">
            {t.edit.confirmDelete(entry.label)}
          </p>
          <div className="flex flex-wrap gap-8">
            <Button variant="danger" onClick={confirm} disabled={deleting}>
              {deleting ? t.edit.deleting : t.edit.confirmDeleteAction}
            </Button>
            <Button onClick={() => setPhase("idle")} disabled={deleting}>
              {t.edit.cancel}
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

type EditActivityContainerProps = {
  entry: ActivityEntry;
  /** The entry's catalog row; null when it was deleted. */
  activity: CatalogActivity | null;
  /** Weight on or before the entry's day; null when none is logged. */
  weight: ActivityWeight | null;
  onDone: () => void;
};

function EditDurationForm({
  entry,
  activity,
  weight,
  onDone,
}: EditActivityContainerProps & { activity: CatalogActivity; weight: ActivityWeight }) {
  const [state, formAction, pending] = useActionState(async (previous: ActivityFormState, formData: FormData) => {
    const next = await updateActivityEntry(previous, formData);
    if (next.status === "saved") onDone();
    return next;
  }, initialActivityFormState);

  return (
    <ActivityEntryForm
      title={entry.label}
      met={activity.met}
      weightKg={weight.kg}
      defaultMinutes={formatAmount(entry.minutes)}
      hidden={{ entryId: String(entry.id) }}
      submitLabel={t.form.update}
      state={state}
      action={formAction}
      pending={pending}
      footer={<DeleteActivityControl entry={entry} onDeleted={onDone} />}
    />
  );
}

/**
 * Edit an entry's duration (kcal are recomputed on the server) or delete it.
 * Without its activity or a weight the duration cannot be recomputed, so
 * only delete is offered.
 */
export function EditActivityContainer({ entry, activity, weight, onDone }: EditActivityContainerProps) {
  if (activity && weight) {
    return <EditDurationForm entry={entry} activity={activity} weight={weight} onDone={onDone} />;
  }
  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-col gap-4">
        <p className="text-body-lg font-semibold text-ink">{entry.label}</p>
        <p className="text-body text-ink-muted">{activity ? t.form.noWeight : t.form.activityDeleted}</p>
      </div>
      <DeleteActivityControl entry={entry} onDeleted={onDone} />
    </div>
  );
}
