import Link from "next/link";
import { cn } from "@/components/ui";
import { PROGRESS_RANGES, progressHref, type ProgressRange } from "../lib/progress-range";
import { progressStrings } from "../strings";

const t = progressStrings.range;

/** 7 / 30 / 90 day links (a segmented control); the current range is aria-current. */
export function RangeNav({ range }: { range: ProgressRange }) {
  return (
    <nav aria-label={t.label}>
      <ul className="inline-flex gap-4 rounded-tags border border-border bg-surface p-4">
        {PROGRESS_RANGES.map((option) => {
          const active = option === range;
          return (
            <li key={option}>
              <Link
                href={progressHref(option)}
                aria-current={active ? "page" : undefined}
                scroll={false}
                className={cn(
                  "inline-flex min-h-36 items-center rounded-tags px-12 text-body font-medium transition-colors duration-150 ease-out",
                  // A 44px hit area around the 36px pill.
                  "relative after:absolute after:-inset-y-4 after:inset-x-0 after:content-['']",
                  active ? "bg-action text-on-action" : "text-ink-muted hover:bg-surface-alt hover:text-ink",
                )}
              >
                {t.option(option)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
