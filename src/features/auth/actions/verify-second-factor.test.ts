import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialVerifyState } from "../lib/second-factor";
import { authStrings } from "../strings";

vi.mock("server-only", () => ({}));

/** redirect() throws in Next.js; the stand-in throws too so nothing runs after it. */
const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT ${path}`);
});
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const listFactors = vi.fn();
const challengeAndVerify = vi.fn();
const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { mfa: { listFactors, challengeAndVerify } }, rpc }),
}));

const { verifySecondFactor } = await import("./verify-second-factor");

const FACTOR = { id: "factor-1", factor_type: "totp", status: "verified" };

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  redirect.mockClear();
  listFactors.mockReset().mockResolvedValue({ data: { all: [FACTOR], totp: [FACTOR], phone: [] }, error: null });
  challengeAndVerify.mockReset().mockResolvedValue({ data: {}, error: null });
  rpc.mockReset().mockResolvedValue({ data: true, error: null });
});

describe("verifySecondFactor", () => {
  it("verifies the code against the TOTP factor and continues to the safe next path", async () => {
    await expect(verifySecondFactor(initialVerifyState, form({ code: "123 456", next: "/diary" }))).rejects.toThrow(
      "NEXT_REDIRECT /diary",
    );
    expect(challengeAndVerify).toHaveBeenCalledWith({ factorId: "factor-1", code: "123456" });
  });

  it("falls back to the default path for an unsafe next", async () => {
    await expect(verifySecondFactor(initialVerifyState, form({ code: "123456", next: "https://evil.example" }))).rejects.toThrow(
      "NEXT_REDIRECT /today",
    );
  });

  it("rejects anything but 6 digits without calling Auth or spending an attempt", async () => {
    const state = await verifySecondFactor(initialVerifyState, form({ code: "12345" }));
    expect(state).toEqual({ fieldError: authStrings.codeInvalid, formError: null });
    expect(rpc).not.toHaveBeenCalled();
    expect(challengeAndVerify).not.toHaveBeenCalled();
  });

  it("says the code is wrong when Auth rejects it", async () => {
    challengeAndVerify.mockResolvedValue({ data: null, error: { status: 422, code: "mfa_verification_failed" } });
    const state = await verifySecondFactor(initialVerifyState, form({ code: "000000" }));
    expect(state).toEqual({ fieldError: null, formError: authStrings.codeIncorrect });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("spends a sign-in attempt per code and refuses once they are spent", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const state = await verifySecondFactor(initialVerifyState, form({ code: "123456" }));
    expect(state.formError).toBe(authStrings.rateLimited);
    expect(rpc).toHaveBeenCalledWith("consume_sign_in_attempt", { client_key: expect.any(String) });
    expect(challengeAndVerify).not.toHaveBeenCalled();
  });

  it("tells the user to wait when Auth rate-limits the verification", async () => {
    challengeAndVerify.mockResolvedValue({ data: null, error: { status: 429, code: "over_request_rate_limit" } });
    const state = await verifySecondFactor(initialVerifyState, form({ code: "123456" }));
    expect(state.formError).toBe(authStrings.rateLimited);
  });

  it("continues when there is no verified factor left to verify", async () => {
    listFactors.mockResolvedValue({ data: { all: [], totp: [], phone: [] }, error: null });
    await expect(verifySecondFactor(initialVerifyState, form({ code: "123456", next: "/progress" }))).rejects.toThrow(
      "NEXT_REDIRECT /progress",
    );
    expect(challengeAndVerify).not.toHaveBeenCalled();
  });

  it("reports a generic error when the factors cannot be read", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    listFactors.mockResolvedValue({ data: null, error: { name: "AuthApiError", message: "down" } });
    const state = await verifySecondFactor(initialVerifyState, form({ code: "123456" }));
    expect(state.formError).toBe(authStrings.verifyUnexpectedError);
    consoleError.mockRestore();
  });
});
