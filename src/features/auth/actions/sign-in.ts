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
    return { email: parsed.value.email, fieldErrors: {}, formError: signInErrorMessage(error) };
  }

  redirect(safeNextPath(formData.get("next")));
}

function signInErrorMessage(error: { code?: string; status?: number }): string {
  // Auth's per-IP sign-in limit (config.toml [auth.rate_limit] sign_in_sign_ups)
  // answers 429 with code over_request_rate_limit. The request comes from this
  // server, so the limit may be shared by every visitor: say so instead of
  // hiding it behind the generic error.
  if (error.code === "over_request_rate_limit" || error.status === 429) return authStrings.rateLimited;
  // Same message for unknown email and wrong password: no account enumeration.
  if (error.code === "invalid_credentials" || error.status === 400) return authStrings.invalidCredentials;
  return authStrings.unexpectedError;
}
