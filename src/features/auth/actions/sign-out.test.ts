import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const signOut = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut } }),
}));

const cookieStore = { getAll: vi.fn(), delete: vi.fn() };
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

const { endSession } = await import("./sign-out");

const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  signOut.mockReset();
  cookieStore.getAll.mockReset();
  cookieStore.delete.mockReset();
  errorLog.mockClear();
  cookieStore.getAll.mockReturnValue([
    { name: "sb-127-auth-token.0", value: "a" },
    { name: "sb-127-auth-token.1", value: "b" },
    { name: "sb-127-auth-token-code-verifier", value: "c" },
    { name: "theme", value: "dark" },
  ]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("endSession", () => {
  it("signs out every session and leaves the cookies to Supabase", async () => {
    signOut.mockResolvedValue({ error: null });
    await endSession();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith();
    expect(cookieStore.delete).not.toHaveBeenCalled();
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("logs a failed sign-out and still clears the session cookies", async () => {
    // auth-js keeps the stored session when it cannot load it (an expired
    // access token whose refresh failed), so the cookies would survive.
    signOut.mockResolvedValue({ error: { name: "AuthRetryableFetchError", status: 0, message: "fetch failed" } });
    await endSession();
    expect(errorLog).toHaveBeenCalledWith("[auth] sign-out failed", "AuthRetryableFetchError", "fetch failed");
    expect(cookieStore.delete.mock.calls.map(([name]) => name)).toEqual([
      "sb-127-auth-token.0",
      "sb-127-auth-token.1",
      "sb-127-auth-token-code-verifier",
    ]);
  });
});
