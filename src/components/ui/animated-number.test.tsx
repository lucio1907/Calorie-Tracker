import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimatedNumber } from "./animated-number";

const format = (value: number) => Math.round(value).toString();

let frames: FrameRequestCallback[] = [];

/** Runs the queued animation frames at `now` ms. */
function runFrames(now: number) {
  const queued = frames;
  frames = [];
  act(() => queued.forEach((callback) => callback(now)));
}

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: matches && query.includes("reduce"), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

function shown(container: HTMLElement) {
  return {
    visual: container.querySelector('[aria-hidden="true"]')?.textContent,
    spoken: container.querySelector(".sr-only")?.textContent,
  };
}

describe("AnimatedNumber", () => {
  beforeEach(() => {
    frames = [];
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => frames.push(callback)));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    stubReducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the value at once the first time an id is seen", () => {
    const { container } = render(<AnimatedNumber id="first" value={1200} format={format} />);

    expect(shown(container)).toEqual({ visual: "1200", spoken: "1200" });
    expect(frames).toHaveLength(0);
  });

  it("counts from the previous value to the new one, ending exactly on it", () => {
    const { container, rerender } = render(<AnimatedNumber id="change" value={1000} format={format} />);
    rerender(<AnimatedNumber id="change" value={2000} format={format} />);

    expect(shown(container)).toEqual({ visual: "1000", spoken: "2000" });
    runFrames(0);
    runFrames(250);
    const midway = Number(shown(container).visual);
    expect(midway).toBeGreaterThan(1000);
    expect(midway).toBeLessThan(2000);
    expect(shown(container).spoken).toBe("2000");
    runFrames(500);
    expect(shown(container)).toEqual({ visual: "2000", spoken: "2000" });
    expect(frames).toHaveLength(0);
  });

  it("counts from the value shown before a remount", () => {
    const first = render(<AnimatedNumber id="remount" value={500} format={format} />);
    first.unmount();

    const { container } = render(<AnimatedNumber id="remount" value={800} format={format} />);
    expect(shown(container)).toEqual({ visual: "500", spoken: "800" });
    runFrames(0);
    runFrames(500);
    expect(shown(container)).toEqual({ visual: "800", spoken: "800" });
  });

  it("jumps straight to the new value with reduced motion", () => {
    stubReducedMotion(true);
    const { container, rerender } = render(<AnimatedNumber id="reduced" value={1000} format={format} />);
    rerender(<AnimatedNumber id="reduced" value={2000} format={format} />);

    expect(shown(container)).toEqual({ visual: "2000", spoken: "2000" });
    expect(frames).toHaveLength(0);
  });
});
