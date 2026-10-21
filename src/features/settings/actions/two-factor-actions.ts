"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/features/auth/data/current-user";
import { parseTotpCode } from "@/features/auth/lib/second-factor";
import { createClient } from "@/lib/supabase/server";
import type { TwoFactorDisableState, TwoFactorEnrollState } from "../lib/types";
import { settingsStrings as t } from "../strings";

/*
 * Two-factor (TOTP) setup through Supabase Auth's MFA API, with the caller's
 * session. Auth itself enforces the rules that matter: a factor only counts
 * once a code verifies it (which also upgrades the session to aal2), and a
 * verified factor can only be removed from an aal2 session. After a change,
 * refresh() re-renders Settings so the section shows the new status.
 */

/**
 * Form action, two steps on one state: the first submit enrolls a new factor
 * and returns its QR code and secret; the next ones verify a code against it.
 */
export async function enrollTwoFactor(previous: TwoFactorEnrollState, formData: FormData): Promise<TwoFactorEnrollState> {
  const user = await getCurrentUser();
  if (!user) return { status: "idle", formError: t.errors.unauthorized };

  return previous.status === "enrolling" ? confirmEnrollment(previous, formData) : startEnrollment();
}

async function startEnrollment(): Promise<TwoFactorEnrollState> {
  const failed: TwoFactorEnrollState = { status: "idle", formError: t.errors.twoFactorStartFailed };
  const supabase = await createClient();

  // An abandoned setup leaves an unverified factor, and Auth refuses a second
  // one with the same (empty) friendly name: remove leftovers first.
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) {
    console.error("[settings] list factors failed", listError.name, listError.message);
    return failed;
  }
  for (const factor of factors.all) {
    if (factor.factor_type !== "totp" || factor.status !== "unverified") continue;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) console.error("[settings] removing an unverified factor failed", error.name, error.message);
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) {
    console.error("[settings] enroll failed", error.name, error.message);
    return failed;
  }
  return {
    status: "enrolling",
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    fieldError: null,
    formError: null,
  };
}

async function confirmEnrollment(
  previous: Extract<TwoFactorEnrollState, { status: "enrolling" }>,
  formData: FormData,
): Promise<TwoFactorEnrollState> {
  const code = parseTotpCode(formData.get("code"));
  if (!code) return { ...previous, fieldError: t.validation.totpCode, formError: null };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: previous.factorId, code });
  if (error?.code === "mfa_verification_failed") {
    return { ...previous, fieldError: t.validation.totpCodeIncorrect, formError: null };
  }
  if (error) {
    console.error("[settings] verify factor failed", error.name, error.code, error.message);
    return { ...previous, fieldError: null, formError: t.errors.twoFactorConfirmFailed };
  }

  refresh();
  return { status: "idle", formError: null };
}

/** Form action: removes the verified factor named by the form (Auth requires an aal2 session). */
export async function disableTwoFactor(_previous: TwoFactorDisableState, formData: FormData): Promise<TwoFactorDisableState> {
  const user = await getCurrentUser();
  if (!user) return { formError: t.errors.unauthorized };

  const factorId = formData.get("factorId");
  if (typeof factorId !== "string" || factorId === "") return { formError: t.errors.twoFactorDisableFailed };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    console.error("[settings] unenroll failed", error.name, error.code, error.message);
    return { formError: error.code === "insufficient_aal" ? t.errors.twoFactorNeedsCode : t.errors.twoFactorDisableFailed };
  }

  refresh();
  return { formError: null };
}
