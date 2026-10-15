import type { ReactNode } from "react";
import { requireUser } from "../data/current-user";

/**
 * Server-side authorization for every protected route. The proxy redirect is
 * only an optimistic check; this verifies the session before rendering.
 * Must sit inside a <Suspense> boundary (it reads request cookies).
 */
export async function AuthGate({ children }: { children: ReactNode }) {
  await requireUser();
  return children;
}
