import type { CSSProperties } from "react";
import { cn } from "./cn";

type ProgressBarProps = {
  /** Share filled, 0 to 1 (clamped). */
  value: number;
  /** Fill color class, e.g. "bg-protein". */
  fillClassName: string;
  className?: string;
};

/**
 * Decorative 8px bar (the numbers next to it carry the meaning, so it is
 * hidden from assistive tech). The fill slides in with a transform from
 * empty on first paint and to the new value when it changes; it never
 * animates width, so nothing reflows.
 */
export function ProgressBar({ value, fillClassName, className }: ProgressBarProps) {
  const progress = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <div aria-hidden="true" className={cn("h-8 w-full overflow-hidden rounded-full bg-surface-alt", className)}>
      <div
        data-progress={progress}
        style={{ "--progress": progress } as CSSProperties}
        className={cn(
          "h-full w-full translate-x-[calc((var(--progress)-1)*100%)] rounded-full transition-transform duration-600 ease-enter starting:-translate-x-full",
          fillClassName,
        )}
      />
    </div>
  );
}
