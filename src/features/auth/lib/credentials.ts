import { authStrings } from "../strings";

export type Credentials = { email: string; password: string };

export type CredentialErrors = Partial<Record<keyof Credentials, string>>;

export type ParseResult =
  | { ok: true; value: Credentials }
  | { ok: false; errors: CredentialErrors; email: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates the sign-in form fields. Passwords are not trimmed. */
export function parseCredentials(formData: FormData): ParseResult {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";

  const errors: CredentialErrors = {};
  if (email === "") errors.email = authStrings.emailRequired;
  else if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.email = authStrings.emailInvalid;
  if (password === "") errors.password = authStrings.passwordRequired;

  if (errors.email || errors.password) return { ok: false, errors, email };
  return { ok: true, value: { email, password } };
}
