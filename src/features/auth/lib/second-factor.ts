import { DEFAULT_AFTER_SIGN_IN } from "./safe-next-path";

/** The challenge page: asks for the authenticator code after the password. */
export const VERIFY_PATH = "/login/verify";

/** The challenge page, carrying where to continue afterwards (`next` must already be safe). */
export function verifyPath(next: string): string {
  return next === DEFAULT_AFTER_SIGN_IN ? VERIFY_PATH : `${VERIFY_PATH}?${new URLSearchParams({ next })}`;
}

type AssuranceLevels = { currentLevel: string | null; nextLevel: string | null } | null;

/** aal1 with a verified factor: the database shows nothing until the code is entered. */
export function secondFactorDue(levels: AssuranceLevels): boolean {
  return levels?.currentLevel === "aal1" && levels.nextLevel === "aal2";
}

/** A 6-digit TOTP code, ignoring spaces (apps show "123 456"); null when it is not one. */
export function parseTotpCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.replace(/\s/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}

export type VerifyState = { fieldError: string | null; formError: string | null };

export const initialVerifyState: VerifyState = { fieldError: null, formError: null };
