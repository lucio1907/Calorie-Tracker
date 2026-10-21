import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_SIGN_IN, safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it.each(["/today", "/diary?date=2026-10-14", "/foods/123"])("keeps the same-origin path %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it("returns the resolved path when it contains dot segments", () => {
    expect(safeNextPath("/foods/../today?view=week#top")).toBe("/today?view=week#top");
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
    ["dot segment before a double slash", "/.//evil.example"],
    ["encoded dot segment before a double slash", "/%2e//evil.example"],
    ["parent segment before a double slash", "/x/..//evil.example"],
    ["dot segment before a backslash", "/./\\evil.example"],
    ["login reached through a dot segment", "/./login"],
  ])("falls back to the default for %s", (_label, value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_AFTER_SIGN_IN);
  });
});
