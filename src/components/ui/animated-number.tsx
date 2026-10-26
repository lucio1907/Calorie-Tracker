"use client";

import { useEffect, useState } from "react";

const DURATION_MS = 500;

/**
 * Last value shown per id in this browser session, so a number that remounts
 * (e.g. Today after visiting the diary) counts from where it was. Only effects
 * write it, so on the server it stays empty and never leaks across requests.
 */
const lastShown = new Map<string, number>();

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Cubic ease-out: fast start, gentle landing. */
function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

type Tween = { id: string; from: number; to: number; progress: number };

function displayed(tween: Tween): number {
  return tween.from + (tween.to - tween.from) * tween.progress;
}

/** Where counting starts: the number on screen, else the last one shown for this id, else nowhere (no animation). */
function startOf(id: string, value: number, current?: Tween): number {
  if (prefersReducedMotion()) return value;
  if (current?.id === id) return displayed(current);
  return lastShown.get(id) ?? value;
}

type AnimatedNumberProps = {
  /** Identifies the number across remounts, e.g. "today-remaining". */
  id: string;
  value: number;
  format: (value: number) => string;
  className?: string;
};

/**
 * A formatted number that counts from the last value shown for the same `id`
 * to the new one over 500ms. The first time an id is seen, and under
 * prefers-reduced-motion, it shows the value at once. Screen readers get only
 * the final value; the counting text is hidden from them.
 */
export function AnimatedNumber({ id, value, format, className }: AnimatedNumberProps) {
  const [tween, setTween] = useState<Tween>(() => ({ id, from: startOf(id, value), to: value, progress: 0 }));

  // Adjust state while rendering when the value changes (React's "storing information from previous renders").
  if (tween.id !== id || tween.to !== value) {
    setTween({ id, from: startOf(id, value, tween), to: value, progress: 0 });
  }

  const { from, to } = tween;
  useEffect(() => {
    lastShown.set(id, to);
    if (from === to) return;

    let frame = 0;
    let start: number | undefined;
    const step = (now: number) => {
      start ??= now;
      const elapsed = Math.min(1, (now - start) / DURATION_MS);
      setTween((current) => (current.from === from && current.to === to ? { ...current, progress: easeOut(elapsed) } : current));
      if (elapsed < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [id, from, to]);

  return (
    <span className={className}>
      <span aria-hidden="true">{format(from === to ? to : displayed(tween))}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
