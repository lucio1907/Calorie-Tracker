import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialSignInState } from "../lib/sign-in-state";
import { authStrings } from "../strings";

vi.mock("server-only", () => ({}));

/** redirect() throws in Next.js; the stand-in throws too so nothing runs after it. */
const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT ${path}`);
});
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));

let requestHeaders = new Headers();
vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));

const signInWithPassword = vi.fn();
const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithPassword }, rpc }),
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

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** The client key sent with the last consume_sign_in_attempt call. */
function sentClientKey(): string {
  expect(rpc).toHaveBeenCalledWith("consume_sign_in_attempt", { client_key: expect.any(String) });
  return rpc.mock.lastCall?.[1].client_key;
}

beforeEach(() => {
  redirect.mockClear();
  signInWithPassword.mockReset();
  rpc.mockReset();
  // An attempt is available unless a test says otherwise.
  rpc.mockResolvedValue({ data: true, error: null });
  requestHeaders = new Headers();
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
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("signIn throttle", () => {
  it("refuses without calling Auth when the client's attempts are spent", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const state = await signIn(initialSignInState, form({ email: EMAIL, password: "pw" }));
    expect(state).toEqual({ email: EMAIL, fieldErrors: {}, formError: authStrings.rateLimited });
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("takes an attempt before calling Auth when one is available", async () => {
    signInWithPassword.mockResolvedValue(authError(400, "invalid_credentials"));
    await signIn(initialSignInState, form({ email: EMAIL, password: "wrong" }));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(signInWithPassword.mock.invocationCallOrder[0]);
  });

  it("fails open and still calls Auth when the throttle errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { message: "connection refused" } });
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    await expect(signIn(initialSignInState, form({ email: EMAIL, password: "pw" }))).rejects.toThrow("NEXT_REDIRECT /today");
    expect(signInWithPassword).toHaveBeenCalledWith({ email: EMAIL, password: "pw" });
    expect(consoleError).toHaveBeenCalledWith("[auth] consume_sign_in_attempt failed", "connection refused");
    consoleError.mockRestore();
  });

  it("keys the attempt by a SHA-256 digest of x-real-ip, never the raw IP", async () => {
    requestHeaders = new Headers({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" });
    signInWithPassword.mockResolvedValue(authError(400, "invalid_credentials"));
    await signIn(initialSignInState, form({ email: EMAIL, password: "wrong" }));
    const key = sentClientKey();
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).toBe(sha256("203.0.113.7"));
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("203.0.113.7");
  });

  it("falls back to the first x-forwarded-for entry without x-real-ip", async () => {
    requestHeaders = new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" });
    signInWithPassword.mockResolvedValue(authError(400, "invalid_credentials"));
    await signIn(initialSignInState, form({ email: EMAIL, password: "wrong" }));
    expect(sentClientKey()).toBe(sha256("198.51.100.1"));
  });

  it("puts requests without a client IP header in one shared bucket", async () => {
    signInWithPassword.mockResolvedValue(authError(400, "invalid_credentials"));
    await signIn(initialSignInState, form({ email: EMAIL, password: "wrong" }));
    expect(sentClientKey()).toBe(sha256("unknown"));
  });
});
