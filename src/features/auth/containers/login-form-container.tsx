"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { signIn } from "../actions/sign-in";
import { LoginForm } from "../components/login-form";
import { initialSignInState } from "../lib/sign-in-state";

/** Wires the presentational LoginForm to the signIn Server Action. */
export function LoginFormContainer() {
  const next = useSearchParams().get("next") ?? undefined;
  const [state, formAction, pending] = useActionState(signIn, initialSignInState);

  return <LoginForm state={state} action={formAction} pending={pending} next={next} />;
}
