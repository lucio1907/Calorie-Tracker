export const DEFAULT_AFTER_SIGN_IN = "/today";

const MAX_LENGTH = 512;

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Returns a same-origin path to continue to after sign-in, or the default.
 * Rejects absolute and protocol-relative URLs to prevent open redirects.
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || value.length > MAX_LENGTH) return DEFAULT_AFTER_SIGN_IN;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_AFTER_SIGN_IN;
  if (hasControlCharacters(value)) return DEFAULT_AFTER_SIGN_IN;
  if (value === "/login" || value.startsWith("/login/") || value.startsWith("/login?")) return DEFAULT_AFTER_SIGN_IN;
  return value;
}
