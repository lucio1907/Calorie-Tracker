"use client";

import { useActionState } from "react";
import { lookupBarcode } from "../actions/off-actions";
import { BarcodeForm } from "../components/barcode-form";
import { initialBarcodeLookupState, type BarcodeLookupState } from "../lib/form-state";

/** Barcode entry: finds the food (own, shared or Open Food Facts) and opens it. */
export function BarcodeLookupContainer({ onFound }: { onFound: (foodId: number) => void }) {
  const [state, formAction, pending] = useActionState(async (previous: BarcodeLookupState, formData: FormData) => {
    const next = await lookupBarcode(previous, formData);
    if (next.status === "found" && next.foodId !== null) onFound(next.foodId);
    return next;
  }, initialBarcodeLookupState);

  return <BarcodeForm state={state} action={formAction} pending={pending} />;
}
