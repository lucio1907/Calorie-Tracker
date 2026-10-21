import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { secondFactorDue, VERIFY_PATH } from "../lib/second-factor";

export type CurrentUser = { id: string; email: string | null };

/**
 * Data Access Layer entry point for the signed-in user.
 * Uses getClaims(), which verifies the JWT, never the unverified getSession().
 * Deduplicated per request with React cache().
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // getClaims() compares the token expiry with Date.now(); createClient()
  // awaits io() first, so that clock read stays at request time.
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

/**
 * True when the session is aal1 but the user has a verified MFA factor: RLS
 * shows such a session nothing (migration mfa_aal2_policies), so the code
 * must be entered first. The factors come from Auth (getUser with the
 * access token), not from the cookie's copy of the user, which is unverified
 * and stays stale until the next token refresh. Fails open with a log: the
 * database enforces the rule either way.
 */
export const needsSecondFactor = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return false;

  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(accessToken);
  if (error) {
    console.error("[auth] assurance level check failed", error.name, error.message);
    return false;
  }
  return secondFactorDue(data);
});

/**
 * Returns the signed-in user, or redirects to /login (no session) or to the
 * second-factor challenge (aal1 session of a user with MFA). For pages only:
 * Server Actions use getCurrentUser() and rely on RLS for the MFA rule.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (await needsSecondFactor()) redirect(VERIFY_PATH);
  return user;
}
