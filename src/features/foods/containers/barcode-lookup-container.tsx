"use client";

import { startTransition, useActionState } from "react";
import { lookupBarcode } from "../actions/off-actions";
import { BarcodeForm } from "../components/barcode-form";
import { BarcodeScanner } from "../components/barcode-scanner";
import { useBarcodeScanner } from "../hooks/use-barcode-scanner";
import { initialBarcodeLookupState, type BarcodeLookupState } from "../lib/form-state";

/** Barcode entry (typed or scanned): finds the food (own, shared or Open Food Facts) and opens it. */
export function BarcodeLookupContainer({ onFound }: { onFound: (foodId: number) => void }) {
  const [state, formAction, pending] = useActionState(async (previous: BarcodeLookupState, formData: FormData) => {
    const next = await lookupBarcode(previous, formData);
    if (next.status === "found" && next.foodId !== null) onFound(next.foodId);
    return next;
  }, initialBarcodeLookupState);

  const scanner = useBarcodeScanner((barcode) => {
    const formData = new FormData();
    formData.set("barcode", barcode);
    startTransition(() => formAction(formData));
  });

  return (
    <div className="flex flex-col gap-12">
      <BarcodeForm state={state} action={formAction} pending={pending} />
      <BarcodeScanner
        videoRef={scanner.videoRef}
        scanning={scanner.scanning}
        error={scanner.error}
        onStart={scanner.start}
        onStop={scanner.stop}
        disabled={pending}
      />
    </div>
  );
}
