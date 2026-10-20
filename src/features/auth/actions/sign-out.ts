"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Ends the session without navigating. The sign-out button then loads /login
 * as a new document: a client navigation would keep this user's screens (and
 * their state) mounted in hidden <Activity> boundaries for the next account.
 */
export async function endSession(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/**
 * Form action for submits before hydration (or without JavaScript): the
 * redirect answers the native form post, so /login is a full document load.
 */
export async function signOut(): Promise<void> {
  await endSession();
  redirect("/login");
}
