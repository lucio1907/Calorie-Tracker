"use client";

import { useActionState } from "react";
import { logWeight } from "../actions/settings-actions";
import { WeightForm } from "../components/weight-form";
import { initialWeightFormState } from "../lib/types";

/** Wires WeightForm to the logWeight Server Action. */
export function WeightFormContainer() {
  const [state, formAction, pending] = useActionState(logWeight, initialWeightFormState);

  return <WeightForm state={state} action={formAction} pending={pending} />;
}
