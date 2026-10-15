"use client";

import { useActionState, useState, useTransition } from "react";
import { addPortion, deletePortion, updatePortion } from "../actions/portion-actions";
import { PortionForm } from "../components/portion-form";
import { PortionList } from "../components/portion-list";
import { toInputValue } from "../lib/format";
import { initialPortionFormState, type PortionFormState } from "../lib/form-state";
import type { FoodPortion } from "../lib/types";
import { foodsStrings } from "../strings";

const t = foodsStrings.portions;

type PortionEditorContainerProps = {
  foodId: number;
  portions: FoodPortion[];
  onChanged: () => void;
};

function PortionEditForm({ portion, onDone, onCancel }: { portion: FoodPortion; onDone: () => void; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(async (previous: PortionFormState, formData: FormData) => {
    const next = await updatePortion(previous, formData);
    if (next.status === "saved") onDone();
    return next;
  }, initialPortionFormState);

  return (
    <PortionForm
      state={state}
      action={formAction}
      pending={pending}
      hidden={{ portionId: portion.id }}
      defaults={{ label: portion.label, grams: toInputValue(portion.grams) }}
      submitLabel={t.save}
      pendingLabel={t.saving}
      onCancel={onCancel}
    />
  );
}

/** Portions of the user's own food: list with edit/remove plus an "add portion" form. */
export function PortionEditorContainer({ foodId, portions, onChanged }: PortionEditorContainerProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [addState, addAction, adding] = useActionState(async (previous: PortionFormState, formData: FormData) => {
    const next = await addPortion(previous, formData);
    if (next.status === "saved") onChanged();
    return next;
  }, initialPortionFormState);

  function remove(portion: FoodPortion) {
    setRemovingId(portion.id);
    setRemoveError(null);
    startTransition(async () => {
      const result = await deletePortion(portion.id);
      setRemovingId(null);
      if (result.ok) onChanged();
      else setRemoveError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-16">
      <PortionList
        portions={portions}
        editable
        editingId={editingId}
        busyId={removingId}
        onEdit={(portion) => setEditingId(portion.id)}
        onRemove={remove}
        renderEditor={(portion) => (
          <PortionEditForm
            portion={portion}
            onCancel={() => setEditingId(null)}
            onDone={() => {
              setEditingId(null);
              onChanged();
            }}
          />
        )}
      />
      {removeError ? (
        <p role="alert" className="text-body text-danger-ink">
          {removeError}
        </p>
      ) : null}
      <PortionForm
        key={addState.version}
        state={addState}
        action={addAction}
        pending={adding}
        hidden={{ foodId }}
        submitLabel={t.add}
        pendingLabel={t.adding}
      />
    </div>
  );
}
