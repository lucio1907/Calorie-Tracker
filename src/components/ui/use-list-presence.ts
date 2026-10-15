"use client";

import { useEffect, useState } from "react";

/** How long a removed row stays on screen to play its exit (the list-exit animation is shorter). */
export const LIST_EXIT_MS = 160;

export type PresencePhase = "present" | "entering" | "exiting";

export type Presence<T> = { key: string | number; item: T; phase: PresencePhase };

/**
 * Props for a row in each phase: new rows rise in, removed rows fade out
 * (keyframes in theme.css) and can no longer be reached while they do.
 */
export function presenceProps(phase: PresencePhase): { className?: string; inert?: boolean } {
  if (phase === "entering") return { className: "animate-list-enter" };
  if (phase === "exiting") return { className: "pointer-events-none animate-list-exit", inert: true };
  return {};
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * `next` in its order, with rows that just disappeared kept (as "exiting")
 * right after the row that preceded them before.
 */
function merge<T>(previous: Presence<T>[], next: readonly T[], keyOf: (item: T) => string | number, keepExiting: boolean): Presence<T>[] {
  const before = new Map(previous.map((row) => [row.key, row]));
  const result: Presence<T>[] = next.map((item) => {
    const key = keyOf(item);
    const known = before.get(key);
    return { key, item, phase: known && known.phase !== "exiting" ? known.phase : "entering" };
  });
  if (!keepExiting) return result;

  const nextKeys = new Set(result.map((row) => row.key));
  previous.forEach((row, index) => {
    if (nextKeys.has(row.key)) return;
    const anchor = previous
      .slice(0, index)
      .reverse()
      .find((candidate) => result.some((kept) => kept.key === candidate.key));
    const at = anchor ? result.findIndex((kept) => kept.key === anchor.key) + 1 : 0;
    result.splice(at, 0, { ...row, phase: "exiting" });
  });
  return result;
}

/**
 * Tracks which rows of a list were added or removed since the list first
 * rendered, so rows can animate in and out with CSS (no animation on the
 * first render, e.g. on page load or when a new day mounts). Removed rows
 * linger for LIST_EXIT_MS; with reduced motion they go at once.
 */
export function useListPresence<T>(items: readonly T[], keyOf: (item: T) => string | number): Presence<T>[] {
  const [state, setState] = useState(() => ({
    items,
    rows: items.map((item): Presence<T> => ({ key: keyOf(item), item, phase: "present" })),
  }));

  // Adjust state while rendering when the list changes (React's "storing information from previous renders").
  if (state.items !== items) {
    setState({ items, rows: merge(state.rows, items, keyOf, !prefersReducedMotion()) });
  }

  const hasExiting = state.rows.some((row) => row.phase === "exiting");
  useEffect(() => {
    if (!hasExiting) return;
    const timer = setTimeout(() => {
      setState((current) => ({ ...current, rows: current.rows.filter((row) => row.phase !== "exiting") }));
    }, LIST_EXIT_MS);
    return () => clearTimeout(timer);
  }, [hasExiting, state.items]);

  return state.rows;
}
