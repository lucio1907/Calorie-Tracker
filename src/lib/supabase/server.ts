import "server-only";
import { createServerClient } from "@supabase/ssr";
import { io } from "next/cache";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Create one per request; never share it across requests.
 *
 * The client reads the clock as soon as it exists: @supabase/ssr subscribes
 * to auth state changes, which loads the cookie session and compares its
 * expiry with Date.now() (getClaims() does the same). With Cache Components +
 * partial prefetching, cookies are available while the session shell is
 * prerendered, so that read would be flagged ("encountered the unstable value
 * `Date.now()` while prerendering"). `await io()` suspends during prerender
 * and resolves immediately during a request, in actions and route handlers,
 * so every caller is safe without guarding itself.
 * Docs: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md
 */
export async function createClient() {
  await io();
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Safe to ignore: the proxy refreshes the session on every request.
        }
      },
    },
  });
}
