import "server-only";
import { io } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string | null };

/**
 * Data Access Layer entry point for the signed-in user.
 * Uses getClaims(), which verifies the JWT, never the unverified getSession().
 * Deduplicated per request with React cache().
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // getClaims() compares the token expiry with Date.now(). With Cache
  // Components + partial prefetching, cookies are available while the
  // session shell is prerendered, so that clock read would be flagged
  // ("encountered `Date.now()` while prerendering"). io() keeps the check at
  // request time; it resolves immediately in actions and route handlers.
  // Docs: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md
  await io();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

/** Returns the signed-in user or redirects to /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
