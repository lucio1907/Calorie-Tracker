import { cn } from "./cn";

/**
 * Floating panel for select lists and calendars: a white card with the
 * hairline border, a light shadow so it reads above the page, and a short
 * fade + scale from its trigger side (exit is faster than enter).
 */
export function popoverClassName(className?: string): string {
  return cn(
    "max-w-[calc(100vw-32px)] rounded-cards border border-border bg-surface text-ink shadow-sm outline-none",
    "origin-top data-[placement=top]:origin-bottom data-[placement=top]:[--popover-shift:4px]",
    "data-[entering]:animate-popover-in data-[exiting]:animate-popover-out",
    className,
  );
}
