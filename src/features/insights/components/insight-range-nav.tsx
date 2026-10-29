import Link from "next/link";
import { cn } from "@/components/ui";
import { PROGRESS_RANGES, type ProgressRange } from "@/features/progress/lib/progress-range";
import { insightsHref } from "../lib/insights-href";
import { insightsStrings as t } from "../strings";

/**
 * 7 / 30 / 90 day links for the AI section's generate card, styled like
 * Progress's range selector; the current range is aria-current.
 */
export function InsightRangeNav({ range }: { range: ProgressRange }) {
  return (
    <nav aria-label={t.page.rangeLabel}>
      <ul className="inline-flex gap-4 rounded-tags border border-border bg-surface p-4">
        {PROGRESS_RANGES.map((option) => {
          const active = option === range;
          return (
            <li key={option}>
              <Link
                href={insightsHref(option)}
                aria-current={active ? "page" : undefined}
                scroll={false}
                className={cn(
                  "inline-flex min-h-36 items-center rounded-tags px-12 text-body font-medium transition-colors duration-150 ease-out",
                  // A 44px hit area around the 36px pill.
                  "relative after:absolute after:-inset-y-4 after:inset-x-0 after:content-['']",
                  active ? "bg-action text-on-action" : "text-ink-muted hover:bg-surface-alt hover:text-ink",
                )}
              >
                {t.history.range(option)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
