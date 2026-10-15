import { describe, expect, it } from "vitest";
import { isActive } from "./nav-items";

describe("isActive", () => {
  it("matches the exact route and nested routes", () => {
    expect(isActive("/foods", "/foods")).toBe(true);
    expect(isActive("/foods/42", "/foods")).toBe(true);
  });

  it("does not match routes that only share a prefix", () => {
    expect(isActive("/foodsearch", "/foods")).toBe(false);
    expect(isActive("/today", "/foods")).toBe(false);
  });
});
