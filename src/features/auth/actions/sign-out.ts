"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Supabase auth cookies: `sb-<ref>-auth-token`, its `.N` chunks and its `-code-verifier` companions. */
function isAuthCookie(name: string): boolean {
  return name.startsWith("sb-") && name.includes("-auth-token");
}

/**
 * Ends the session without navigating. The sign-out button then loads /login
 * as a new document: a client navigation would keep this user's screens (and
 * their state) mounted in hidden <Activity> boundaries for the next account.
 *
 * When Auth rejects the sign-out, auth-js already removes the stored session,
 * but when it cannot load the session (an expired access token whose refresh
 * failed) it returns that error and keeps the session; a `scope: "local"`
 * retry would load it the same way. So on any error the auth cookies are
 * cleared here, and this browser is signed out regardless.
 */
export async function endSession(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (!error) return;

  console.error("[auth] sign-out failed", error.name, error.message);
  const cookieStore = await cookies();
  for (const { name } of cookieStore.getAll()) {
    if (isAuthCookie(name)) cookieStore.delete(name);
  }
}

/**
 * Form action for submits before hydration (or without JavaScript): the
 * redirect answers the native form post, so /login is a full document load.
 */
export async function signOut(): Promise<void> {
  await endSession();
  redirect("/login");
}
