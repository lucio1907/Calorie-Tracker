import { requireUser } from "../data/current-user";

/**
 * Server-side authorization for every protected route: redirects to /login
 * when the session does not verify. The proxy redirect is only an optimistic
 * check. Renders nothing and must sit inside its own <Suspense> boundary (it
 * reads request cookies), as a sibling of the page rather than its parent, so
 * each page's static shell (heading, skeleton) is not held behind it.
 *
 * A layout does not re-render on client navigations between its pages, so
 * every page's data component also calls requireUser() before reading data.
 */
export async function AuthGate(): Promise<null> {
  await requireUser();
  return null;
}
