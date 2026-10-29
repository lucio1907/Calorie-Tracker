import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getOpenRouterApiKey } = await import("./openrouter-env");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getOpenRouterApiKey", () => {
  it("returns the trimmed key", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "  sk-or-test  \n");
    expect(getOpenRouterApiKey()).toBe("sk-or-test");
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["blank", "   "],
  ])("throws a clear error when the key is %s", (_label, value) => {
    vi.stubEnv("OPENROUTER_API_KEY", value);
    expect(() => getOpenRouterApiKey()).toThrow(/OPENROUTER_API_KEY is not set/);
  });
});
