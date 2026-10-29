import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOptimisticPathname } from "./use-optimistic-pathname";

const navigation = vi.hoisted(() => ({ pathname: "/today" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

describe("useOptimisticPathname", () => {
  beforeEach(() => {
    navigation.pathname = "/today";
  });

  it("returns the current pathname before any navigation", () => {
    const { result } = renderHook(() => useOptimisticPathname());
    expect(result.current.pathname).toBe("/today");
  });

  it("moves to the clicked destination right away, before the route commits", () => {
    const { result } = renderHook(() => useOptimisticPathname());

    act(() => result.current.onNavigate("/diary"));

    expect(result.current.pathname).toBe("/diary");
  });

  it("follows the real pathname once it changes (back button, redirects)", () => {
    const { result, rerender } = renderHook(() => useOptimisticPathname());
    act(() => result.current.onNavigate("/diary"));

    navigation.pathname = "/settings";
    rerender();

    expect(result.current.pathname).toBe("/settings");
  });

  it("goes back to the real pathname when the navigation ends without leaving the page", () => {
    const { result } = renderHook(() => useOptimisticPathname());
    act(() => result.current.onNavigate("/diary"));

    act(() => result.current.onSettled("/diary"));

    expect(result.current.pathname).toBe("/today");
  });

  it("keeps the newer destination when an earlier link settles", () => {
    const { result } = renderHook(() => useOptimisticPathname());
    act(() => result.current.onNavigate("/diary"));
    act(() => result.current.onNavigate("/settings"));

    act(() => result.current.onSettled("/diary"));

    expect(result.current.pathname).toBe("/settings");
  });
});
