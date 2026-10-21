"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { verifySecondFactor } from "../actions/verify-second-factor";
import { VerifyForm } from "../components/verify-form";
import { initialVerifyState } from "../lib/second-factor";

/** Wires the presentational VerifyForm to the verifySecondFactor Server Action. */
export function VerifyFormContainer() {
  const next = useSearchParams().get("next") ?? undefined;
  const [state, formAction, pending] = useActionState(verifySecondFactor, initialVerifyState);

  return <VerifyForm state={state} action={formAction} pending={pending} next={next} />;
}
