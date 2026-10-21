import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getCurrentUser = vi.fn();
vi.mock("@/features/auth/data/current-user", () => ({ getCurrentUser: () => getCurrentUser() }));

let slotGranted = true;
const rpc = vi.fn(() => Promise.resolve({ data: slotGranted, error: null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));

const { GET } = await import("./route");

const fetchMock = vi.fn<typeof fetch>();

function search(query: string): Promise<Response> {
  const url = new URL("http://localhost/api/off/search");
  url.searchParams.set("q", query);
  return GET({ nextUrl: url } as NextRequest);
}

beforeEach(() => {
  slotGranted = true;
  vi.stubGlobal("fetch", fetchMock);
  getCurrentUser.mockReset().mockResolvedValue({ id: "user-a", email: null });
});

afterEach(() => {
  fetchMock.mockReset();
  rpc.mockClear();
  vi.unstubAllGlobals();
});

describe("GET /api/off/search", () => {
  it("takes a search slot before calling OFF", async () => {
    fetchMock.mockResolvedValue(Response.json({ hits: [] }));
    const response = await search("yerba");
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("consume_off_request", { request_kind: "search" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("answers 429 without calling OFF when the user has no search slot left", async () => {
    slotGranted = false;
    const response = await search("yerba");
    expect(response.status).toBe(429);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not take a slot for an invalid query", async () => {
    const response = await search("ab");
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});
