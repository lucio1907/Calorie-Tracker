import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// React's cache() only dedupes inside a server request; here every call runs.
vi.mock("react", async (importOriginal) => ({ ...(await importOriginal<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT ${path}`);
});
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));

const getClaims = vi.fn();
const getSession = vi.fn();
const getAuthenticatorAssuranceLevel = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims, getSession, mfa: { getAuthenticatorAssuranceLevel } } }),
}));

const { requireUser } = await import("./current-user");

function levels(currentLevel: string, nextLevel: string) {
  return { data: { currentLevel, nextLevel, currentAuthenticationMethods: [] }, error: null };
}

beforeEach(() => {
  redirect.mockClear();
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: "user-a", email: "a@local.test" } }, error: null });
  getSession.mockReset().mockResolvedValue({ data: { session: { access_token: "token-a" } }, error: null });
  getAuthenticatorAssuranceLevel.mockReset().mockResolvedValue(levels("aal1", "aal1"));
});

describe("requireUser", () => {
  it("returns the user of a session without MFA", async () => {
    await expect(requireUser()).resolves.toEqual({ id: "user-a", email: "a@local.test" });
  });

  it("redirects to /login without a session", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT /login");
  });

  it("sends an aal1 session of a user with a verified factor to the challenge", async () => {
    getAuthenticatorAssuranceLevel.mockResolvedValue(levels("aal1", "aal2"));
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT /login/verify");
  });

  it("checks the factors with Auth using the access token, not the cookie's user", async () => {
    await requireUser();
    expect(getAuthenticatorAssuranceLevel).toHaveBeenCalledWith("token-a");
  });

  it("lets an aal2 session through", async () => {
    getAuthenticatorAssuranceLevel.mockResolvedValue(levels("aal2", "aal2"));
    await expect(requireUser()).resolves.toEqual({ id: "user-a", email: "a@local.test" });
  });

  it("fails open when the check errors (RLS still enforces the rule)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    getAuthenticatorAssuranceLevel.mockResolvedValue({ data: null, error: { name: "AuthApiError", message: "down" } });
    await expect(requireUser()).resolves.toEqual({ id: "user-a", email: "a@local.test" });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
