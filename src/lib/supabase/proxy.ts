import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

/** Routes reachable without a session. */
const PUBLIC_PATHS = ["/login"];
const HOME_PATH = "/today";
/** The second-factor challenge (features/auth): needs a session, and an aal1 one must be able to stay. */
const VERIFY_PATH = "/login/verify";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Refreshes the Supabase session cookie and does the optimistic auth redirect.
 * Authorization is re-checked on the server (see features/auth/data); this is
 * only the fast path.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): getClaims()
  // validates the JWT and triggers the token refresh that keeps users signed in.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  if (pathname === VERIFY_PATH) {
    return isSignedIn ? response : redirectPreservingCookies(request, response, "/login");
  }

  if (!isSignedIn && !isPublicPath(pathname)) {
    return redirectPreservingCookies(request, response, "/login", pathname);
  }

  if (isSignedIn && isPublicPath(pathname)) {
    return redirectPreservingCookies(request, response, HOME_PATH);
  }

  return response;
}

function redirectPreservingCookies(
  request: NextRequest,
  source: NextResponse,
  pathname: string,
  next?: string,
): NextResponse {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  target.search = "";
  if (next && next !== "/") {
    target.searchParams.set("next", next);
  }

  const redirect = NextResponse.redirect(target);
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}
