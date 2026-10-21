import "server-only";
import { createClient } from "@/lib/supabase/server";

/** The caller's verified TOTP factor id, or null when two-factor authentication is off. Reads Auth (getUser). */
export async function getVerifiedTotpFactorId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(`factors: ${error.message}`);
  // listFactors() puts only verified factors in the per-type lists.
  return data.totp[0]?.id ?? null;
}
