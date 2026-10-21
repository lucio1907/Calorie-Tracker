import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialBarcodeLookupState } from "../lib/form-state";
import { foodsStrings } from "../strings";

vi.mock("server-only", () => ({}));

const getCurrentUser = vi.fn();
vi.mock("@/features/auth/data/current-user", () => ({ getCurrentUser: () => getCurrentUser() }));

const ensureOffFood = vi.fn();
vi.mock("../data/off-foods", () => ({ ensureOffFood: (...args: unknown[]) => ensureOffFood(...args) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

const { importOffProduct, lookupBarcode } = await import("./off-actions");
const { OffRateLimitedError } = await import("../data/off-throttle");
const { OffUnavailableError } = await import("../data/open-food-facts");

const t = foodsStrings.barcode;

function form(barcode: string): FormData {
  const data = new FormData();
  data.set("barcode", barcode);
  return data;
}

beforeEach(() => {
  ensureOffFood.mockReset();
  getCurrentUser.mockReset().mockResolvedValue({ id: "user-a", email: null });
});

describe("OFF throttling messages", () => {
  it("lookupBarcode reports a throttled lookup", async () => {
    ensureOffFood.mockRejectedValue(new OffRateLimitedError("product"));
    const state = await lookupBarcode(initialBarcodeLookupState, form("7790000000001"));
    expect(state).toMatchObject({ status: "error", error: t.rateLimited, barcode: "7790000000001" });
  });

  it("importOffProduct reports a throttled import", async () => {
    ensureOffFood.mockRejectedValue(new OffRateLimitedError("product"));
    await expect(importOffProduct("7790000000001")).resolves.toEqual({ ok: false, error: t.rateLimited });
  });

  it("keeps the unavailable message for OFF errors", async () => {
    ensureOffFood.mockRejectedValue(new OffUnavailableError("down"));
    await expect(importOffProduct("7790000000001")).resolves.toEqual({ ok: false, error: t.unavailable });
  });
});
