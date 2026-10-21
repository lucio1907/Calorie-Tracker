import { redirect } from "next/navigation";
import { getCurrentUser, needsSecondFactor } from "../data/current-user";
import { safeNextPath } from "../lib/safe-next-path";

/**
 * Server-side check for the challenge page: signed-out visitors go to /login,
 * and sessions with nothing to verify (aal2, or no verified factor) continue
 * to the safe next path. Renders nothing; must sit inside its own <Suspense>
 * (it reads cookies and search params).
 */
export async function SecondFactorGate({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const [{ next }, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (!user) redirect("/login");
  if (!(await needsSecondFactor())) redirect(safeNextPath(next));
  return null;
}
