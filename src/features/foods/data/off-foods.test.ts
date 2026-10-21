import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const findFoodIdByBarcode = vi.fn<(barcodes: string[]) => Promise<number | null>>();
vi.mock("./foods", () => ({ findFoodIdByBarcode: (barcodes: string[]) => findFoodIdByBarcode(barcodes) }));

/** RPC results by function name; every call is recorded in `rpc.mock.calls`. */
type RpcResult = { data: unknown; error: unknown };
let rpcResults: Record<string, RpcResult> = {};
const rpc = vi.fn<(name: string, args?: Record<string, unknown>) => Promise<RpcResult>>((name) =>
  Promise.resolve(rpcResults[name] ?? { data: null, error: null }),
);
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));

const { ensureOffFood } = await import("./off-foods");
const { OffRateLimitedError } = await import("./off-throttle");
const { OffUnavailableError } = await import("./open-food-facts");

const fetchMock = vi.fn<typeof fetch>();
const BARCODE = "7790000000001";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function rpcNames(): string[] {
  return rpc.mock.calls.map(([name]) => name);
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  findFoodIdByBarcode.mockResolvedValue(null);
  rpcResults = {
    off_barcode_recently_missed: { data: false, error: null },
    consume_off_request: { data: true, error: null },
    record_off_barcode_miss: { data: null, error: null },
  };
});

afterEach(() => {
  fetchMock.mockReset();
  rpc.mockClear();
  findFoodIdByBarcode.mockReset();
  vi.unstubAllGlobals();
});

describe("ensureOffFood throttling", () => {
  it("returns a stored food without touching the throttle or OFF", async () => {
    findFoodIdByBarcode.mockResolvedValue(42);
    await expect(ensureOffFood(BARCODE, "user-a")).resolves.toEqual({ ok: true, foodId: 42 });
    expect(rpc).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not call OFF when the user has no product slot left", async () => {
    rpcResults.consume_off_request = { data: false, error: null };
    await expect(ensureOffFood(BARCODE, "user-a")).rejects.toBeInstanceOf(OffRateLimitedError);
    expect(rpc).toHaveBeenCalledWith("consume_off_request", { request_kind: "product" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers not_found for a recent miss without taking a slot or calling OFF", async () => {
    rpcResults.off_barcode_recently_missed = { data: true, error: null };
    await expect(ensureOffFood(BARCODE, "user-a")).resolves.toEqual({ ok: false, reason: "not_found" });
    expect(rpcNames()).toEqual(["off_barcode_recently_missed"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records a miss when OFF does not know the barcode", async () => {
    fetchMock.mockResolvedValue(json({ status: 0, status_verbose: "product not found" }, 404));
    await expect(ensureOffFood(BARCODE, "user-a")).resolves.toEqual({ ok: false, reason: "not_found" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("record_off_barcode_miss", { lookup_barcode: BARCODE });
  });

  it("still answers not_found when recording the miss fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpcResults.record_off_barcode_miss = { data: null, error: { message: "boom" } };
    fetchMock.mockResolvedValue(json({ status: 0 }, 404));
    await expect(ensureOffFood(BARCODE, "user-a")).resolves.toEqual({ ok: false, reason: "not_found" });
  });

  it.each([
    ["a server error", () => Promise.resolve(json({}, 503))],
    ["a network error", () => Promise.reject(new TypeError("fetch failed"))],
  ])("does not record a miss on %s", async (_label, respond) => {
    fetchMock.mockImplementation(respond);
    await expect(ensureOffFood(BARCODE, "user-a")).rejects.toBeInstanceOf(OffUnavailableError);
    expect(rpcNames()).not.toContain("record_off_barcode_miss");
  });

  it("does not record a miss for a product OFF has without calories", async () => {
    fetchMock.mockResolvedValue(json({ status: 1, product: { code: BARCODE, product_name: "Agua", nutriments: {} } }));
    await expect(ensureOffFood(BARCODE, "user-a")).resolves.toEqual({ ok: false, reason: "no_energy" });
    expect(rpcNames()).not.toContain("record_off_barcode_miss");
  });
});
