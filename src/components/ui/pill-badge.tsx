import type { ComponentProps } from "react";
import { cn } from "./cn";

/** Pill Badge from design.md: white, near-black text, 9999px radius, hairline border, minimal padding. */
export function PillBadge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-tags border border-border bg-surface px-8 py-2 text-caption font-medium whitespace-nowrap text-ink-strong",
        className,
      )}
      {...props}
    />
  );
}
