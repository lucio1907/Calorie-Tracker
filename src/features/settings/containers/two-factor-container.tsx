"use client";

import { useActionState } from "react";
import { disableTwoFactor, enrollTwoFactor } from "../actions/two-factor-actions";
import { TwoFactorDisableForm, TwoFactorEnrollForm } from "../components/two-factor-forms";
import { initialTwoFactorDisableState, initialTwoFactorEnrollState } from "../lib/types";

function EnrollContainer() {
  const [state, formAction, pending] = useActionState(enrollTwoFactor, initialTwoFactorEnrollState);
  return <TwoFactorEnrollForm state={state} action={formAction} pending={pending} />;
}

function DisableContainer({ factorId }: { factorId: string }) {
  const [state, formAction, pending] = useActionState(disableTwoFactor, initialTwoFactorDisableState);
  return <TwoFactorDisableForm factorId={factorId} state={state} action={formAction} pending={pending} />;
}

/** Wires the two-factor forms to their Server Actions; `factorId` is the verified factor, when there is one. */
export function TwoFactorContainer({ factorId }: { factorId: string | null }) {
  return factorId ? <DisableContainer factorId={factorId} /> : <EnrollContainer />;
}
