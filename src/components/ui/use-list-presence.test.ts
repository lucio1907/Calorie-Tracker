import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LIST_EXIT_MS, presenceProps, useListPresence } from "./use-list-presence";

type Row = { id: number; label: string };
const keyOf = (row: Row) => row.id;
const a = { id: 1, label: "a" };
const b = { id: 2, label: "b" };
const c = { id: 3, label: "c" };

function phases(rows: { key: string | number; phase: string }[]) {
  return rows.map((row) => `${row.key}:${row.phase}`);
}

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: matches && query.includes("reduce"), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

describe("useListPresence", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not animate the rows of the first render", () => {
    const { result } = renderHook(() => useListPresence([a, b], keyOf));
    expect(phases(result.current)).toEqual(["1:present", "2:present"]);
  });

  it("marks added rows as entering", () => {
    const { result, rerender } = renderHook(({ items }) => useListPresence(items, keyOf), { initialProps: { items: [a] } });
    rerender({ items: [a, c] });
    expect(phases(result.current)).toEqual(["1:present", "3:entering"]);
    expect(presenceProps("entering").className).toContain("animate-list-enter");
  });

  it("keeps a removed row in place while it fades out, then drops it", () => {
    stubReducedMotion(false);
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ items }) => useListPresence(items, keyOf), {
      initialProps: { items: [a, b, c] },
    });

    rerender({ items: [a, c] });
    expect(phases(result.current)).toEqual(["1:present", "2:exiting", "3:present"]);
    expect(presenceProps("exiting")).toEqual({ className: expect.stringContaining("animate-list-exit"), inert: true });

    act(() => vi.advanceTimersByTime(LIST_EXIT_MS));
    expect(phases(result.current)).toEqual(["1:present", "3:present"]);
  });

  it("drops removed rows at once with reduced motion", () => {
    stubReducedMotion(true);
    const { result, rerender } = renderHook(({ items }) => useListPresence(items, keyOf), {
      initialProps: { items: [a, b] },
    });

    rerender({ items: [b] });
    expect(phases(result.current)).toEqual(["2:present"]);
  });

  it("keeps the latest data for rows that stay", () => {
    const { result, rerender } = renderHook(({ items }) => useListPresence(items, keyOf), { initialProps: { items: [a] } });
    rerender({ items: [{ id: 1, label: "renamed" }] });
    expect(result.current[0].item.label).toBe("renamed");
  });
});
