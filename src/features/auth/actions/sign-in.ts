"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseCredentials } from "../lib/credentials";
import { safeNextPath } from "../lib/safe-next-path";
import type { SignInState } from "../lib/sign-in-state";
import { authStrings } from "../strings";

export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = parseCredentials(formData);
  if (!parsed.ok) {
    return { email: parsed.email, fieldErrors: parsed.errors, formError: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.value);

  if (error) {
    // Same message for unknown email and wrong password: no account enumeration.
    const isCredentialError = error.code === "invalid_credentials" || error.status === 400;
    return {
      email: parsed.value.email,
      fieldErrors: {},
      formError: isCredentialError ? authStrings.invalidCredentials : authStrings.unexpectedError,
    };
  }

  redirect(safeNextPath(formData.get("next")));
}
