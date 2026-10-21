import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialSignInState } from "../lib/sign-in-state";
import { authStrings } from "../strings";

vi.mock("server-only", () => ({}));

/** redirect() throws in Next.js; the stand-in throws too so nothing runs after it. */
const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT ${path}`);
});
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));

const signInWithPassword = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithPassword } }),
}));

const { signIn } = await import("./sign-in");

const EMAIL = "owner@local.test";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

/** Shape of the AuthApiError auth-js returns for a non-2xx Auth response. */
function authError(status: number, code?: string) {
  return { data: { user: null, session: null }, error: { name: "AuthApiError", status, code, message: "x" } };
}

beforeEach(() => {
  redirect.mockClear();
  signInWithPassword.mockReset();
});

describe("signIn", () => {
  it("redirects to the safe next path after a successful sign-in", async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    await expect(signIn(initialSignInState, form({ email: EMAIL, password: "pw", next: "/diary" }))).rejects.toThrow(
      "NEXT_REDIRECT /diary",
    );
    expect(signInWithPassword).toHaveBeenCalledWith({ email: EMAIL, password: "pw" });
  });

  it("reports wrong credentials without revealing whether the email exists", async () => {
    signInWithPassword.mockResolvedValue(authError(400, "invalid_credentials"));
    const state = await signIn(initialSignInState, form({ email: EMAIL, password: "wrong" }));
    expect(state).toEqual({ email: EMAIL, fieldErrors: {}, formError: authStrings.invalidCredentials });
  });

  it("tells the user to wait when Auth rate-limits the sign-in", async () => {
    signInWithPassword.mockResolvedValue(authError(429, "over_request_rate_limit"));
    const state = await signIn(initialSignInState, form({ email: EMAIL, password: "pw" }));
    expect(state).toEqual({ email: EMAIL, fieldErrors: {}, formError: authStrings.rateLimited });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("treats a bare 429 without an error code as a rate limit too", async () => {
    signInWithPassword.mockResolvedValue(authError(429));
    const state = await signIn(initialSignInState, form({ email: EMAIL, password: "pw" }));
    expect(state.formError).toBe(authStrings.rateLimited);
  });

  it("falls back to the generic error for anything else", async () => {
    signInWithPassword.mockResolvedValue(authError(500, "unexpected_failure"));
    const state = await signIn(initialSignInState, form({ email: EMAIL, password: "pw" }));
    expect(state.formError).toBe(authStrings.unexpectedError);
  });

  it("returns field errors without calling Auth", async () => {
    const state = await signIn(initialSignInState, form({ email: "", password: "" }));
    expect(state.fieldErrors).toEqual({ email: authStrings.emailRequired, password: authStrings.passwordRequired });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
