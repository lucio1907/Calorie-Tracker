import { describe, expect, it } from "vitest";
import { isActive, SIDEBAR_ITEMS, TAB_BAR_LEADING, TAB_BAR_MORE, TAB_BAR_TRAILING } from "./nav-items";

describe("mobile tab bar", () => {
  it("reaches every sidebar destination exactly once (tabs or the More sheet)", () => {
    const mobile = [...TAB_BAR_LEADING, ...TAB_BAR_TRAILING, ...TAB_BAR_MORE].map((item) => item.href);
    expect(mobile.toSorted()).toEqual(SIDEBAR_ITEMS.map((item) => item.href).toSorted());
  });

  it("lists the More sheet in sidebar order", () => {
    expect(TAB_BAR_MORE.map((item) => item.href)).toEqual(["/activity", "/foods", "/insights", "/settings"]);
  });
});

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
