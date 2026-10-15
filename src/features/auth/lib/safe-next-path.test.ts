import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_SIGN_IN, safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it.each(["/today", "/diary?date=2026-10-14", "/foods/123"])("keeps the same-origin path %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    ["missing", null],
    ["absolute URL", "https://evil.example/today"],
    ["protocol-relative URL", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["relative path", "today"],
    ["control characters", "/today\n"],
    ["login loop", "/login"],
    ["login with query", "/login?next=/today"],
  ])("falls back to the default for %s", (_label, value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_AFTER_SIGN_IN);
  });
});
