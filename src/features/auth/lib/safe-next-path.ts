export const DEFAULT_AFTER_SIGN_IN = "/today";

const MAX_LENGTH = 512;

// Fixed origin used only to resolve the path the way the browser and router will.
const RESOLVE_ORIGIN = "http://next.invalid";

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function isLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

/**
 * Returns a same-origin path to continue to after sign-in, or the default.
 * Rejects absolute and protocol-relative URLs to prevent open redirects,
 * including ones that only appear after dot segments are resolved
 * (`/.//evil.example` resolves to the pathname `//evil.example`).
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || value.length > MAX_LENGTH) return DEFAULT_AFTER_SIGN_IN;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_AFTER_SIGN_IN;
  if (hasControlCharacters(value)) return DEFAULT_AFTER_SIGN_IN;

  let resolved: URL;
  try {
    resolved = new URL(value, RESOLVE_ORIGIN);
  } catch {
    return DEFAULT_AFTER_SIGN_IN;
  }
  if (resolved.origin !== RESOLVE_ORIGIN) return DEFAULT_AFTER_SIGN_IN;
  const { pathname, search, hash } = resolved;
  if (pathname.startsWith("//") || pathname.startsWith("/\\")) return DEFAULT_AFTER_SIGN_IN;
  if (isLoginPath(pathname)) return DEFAULT_AFTER_SIGN_IN;
  return pathname + search + hash;
}
