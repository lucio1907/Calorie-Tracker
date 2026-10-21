"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { takeSignInAttempt } from "../data/sign-in-throttle";
import { safeNextPath } from "../lib/safe-next-path";
import { parseTotpCode, type VerifyState } from "../lib/second-factor";
import { authStrings } from "../strings";

/**
 * Form action of the challenge page: checks the authenticator code against
 * the user's TOTP factor, which upgrades the session to aal2, then continues
 * to the safe next path.
 */
export async function verifySecondFactor(_previous: VerifyState, formData: FormData): Promise<VerifyState> {
  const code = parseTotpCode(formData.get("code"));
  if (!code) return { fieldError: authStrings.codeInvalid, formError: null };

  // A code guess is a sign-in attempt: same per-IP budget as the password.
  if (!(await takeSignInAttempt())) return { fieldError: null, formError: authStrings.rateLimited };

  const supabase = await createClient();
  const next = safeNextPath(formData.get("next"));
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) {
    console.error("[auth] list factors failed", listError.name, listError.message);
    return { fieldError: null, formError: authStrings.verifyUnexpectedError };
  }
  const factor = factors.totp[0];
  // No verified factor (removed meanwhile): there is nothing to verify.
  if (!factor) redirect(next);

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { fieldError: null, formError: verifyErrorMessage(error) };

  redirect(next);
}

function verifyErrorMessage(error: { code?: string; status?: number }): string {
  if (error.code === "mfa_verification_failed") return authStrings.codeIncorrect;
  if (error.code === "over_request_rate_limit" || error.status === 429) return authStrings.rateLimited;
  return authStrings.verifyUnexpectedError;
}
