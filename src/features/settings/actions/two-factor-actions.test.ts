import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialTwoFactorDisableState, initialTwoFactorEnrollState, type TwoFactorEnrollState } from "../lib/types";
import { settingsStrings } from "../strings";

vi.mock("server-only", () => ({}));

const refresh = vi.fn();
vi.mock("next/cache", () => ({ refresh: () => refresh() }));

const getCurrentUser = vi.fn();
vi.mock("@/features/auth/data/current-user", () => ({ getCurrentUser: () => getCurrentUser() }));

const mfa = { listFactors: vi.fn(), enroll: vi.fn(), unenroll: vi.fn(), challengeAndVerify: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { mfa } }) }));

const { disableTwoFactor, enrollTwoFactor } = await import("./two-factor-actions");

const t = settingsStrings;
const QR = "data:image/svg+xml;utf-8,<svg/>";
const ENROLLING: TwoFactorEnrollState = {
  status: "enrolling",
  factorId: "factor-new",
  qrCode: QR,
  secret: "SECRET",
  fieldError: null,
  formError: null,
};

function form(fields: Record<string, string> = {}): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  refresh.mockReset();
  getCurrentUser.mockReset().mockResolvedValue({ id: "user-a", email: null });
  mfa.listFactors.mockReset().mockResolvedValue({ data: { all: [], totp: [], phone: [] }, error: null });
  mfa.enroll.mockReset().mockResolvedValue({ data: { id: "factor-new", totp: { qr_code: QR, secret: "SECRET" } }, error: null });
  mfa.unenroll.mockReset().mockResolvedValue({ data: {}, error: null });
  mfa.challengeAndVerify.mockReset().mockResolvedValue({ data: {}, error: null });
});

describe("enrollTwoFactor: start", () => {
  it("enrolls a TOTP factor and returns its QR code and secret", async () => {
    const state = await enrollTwoFactor(initialTwoFactorEnrollState, form());
    expect(mfa.enroll).toHaveBeenCalledWith({ factorType: "totp" });
    expect(state).toEqual(ENROLLING);
  });

  it("removes unverified factors left by an abandoned setup first", async () => {
    mfa.listFactors.mockResolvedValue({
      data: { all: [{ id: "factor-old", factor_type: "totp", status: "unverified" }], totp: [], phone: [] },
      error: null,
    });
    await enrollTwoFactor(initialTwoFactorEnrollState, form());
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: "factor-old" });
    expect(mfa.unenroll.mock.invocationCallOrder[0]).toBeLessThan(mfa.enroll.mock.invocationCallOrder[0]);
  });

  it("reports a failed enrollment", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mfa.enroll.mockResolvedValue({ data: null, error: { name: "AuthApiError", message: "MFA enroll is disabled for TOTP" } });
    const state = await enrollTwoFactor(initialTwoFactorEnrollState, form());
    expect(state).toEqual({ status: "idle", formError: t.errors.twoFactorStartFailed });
    consoleError.mockRestore();
  });

  it("refuses without a session", async () => {
    getCurrentUser.mockResolvedValue(null);
    const state = await enrollTwoFactor(initialTwoFactorEnrollState, form());
    expect(state).toEqual({ status: "idle", formError: t.errors.unauthorized });
    expect(mfa.enroll).not.toHaveBeenCalled();
  });
});

describe("enrollTwoFactor: confirm", () => {
  it("verifies the code against the new factor and refreshes Settings", async () => {
    const state = await enrollTwoFactor(ENROLLING, form({ code: "123 456" }));
    expect(mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: "factor-new", code: "123456" });
    expect(refresh).toHaveBeenCalled();
    expect(state).toEqual(initialTwoFactorEnrollState);
  });

  it("keeps the QR code on screen and flags a wrong code", async () => {
    mfa.challengeAndVerify.mockResolvedValue({ data: null, error: { status: 422, code: "mfa_verification_failed" } });
    const state = await enrollTwoFactor(ENROLLING, form({ code: "000000" }));
    expect(state).toEqual({ ...ENROLLING, fieldError: t.validation.totpCodeIncorrect });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("flags a malformed code without calling Auth", async () => {
    const state = await enrollTwoFactor(ENROLLING, form({ code: "12" }));
    expect(state).toEqual({ ...ENROLLING, fieldError: t.validation.totpCode });
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled();
  });

  it("reports any other verification error at form level", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mfa.challengeAndVerify.mockResolvedValue({ data: null, error: { name: "AuthApiError", status: 500, message: "x" } });
    const state = await enrollTwoFactor(ENROLLING, form({ code: "123456" }));
    expect(state).toEqual({ ...ENROLLING, formError: t.errors.twoFactorConfirmFailed });
    consoleError.mockRestore();
  });
});

describe("disableTwoFactor", () => {
  it("unenrolls the factor and refreshes Settings", async () => {
    const state = await disableTwoFactor(initialTwoFactorDisableState, form({ factorId: "factor-1" }));
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: "factor-1" });
    expect(refresh).toHaveBeenCalled();
    expect(state).toEqual({ formError: null });
  });

  it("explains that an aal1 session cannot remove a verified factor", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mfa.unenroll.mockResolvedValue({ data: null, error: { name: "AuthApiError", status: 422, code: "insufficient_aal" } });
    const state = await disableTwoFactor(initialTwoFactorDisableState, form({ factorId: "factor-1" }));
    expect(state).toEqual({ formError: t.errors.twoFactorNeedsCode });
    expect(refresh).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("refuses a submit without a factor id", async () => {
    const state = await disableTwoFactor(initialTwoFactorDisableState, form());
    expect(state).toEqual({ formError: t.errors.twoFactorDisableFailed });
    expect(mfa.unenroll).not.toHaveBeenCalled();
  });
});
