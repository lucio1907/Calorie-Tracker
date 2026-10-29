import { Card, EmptyState, PillBadge } from "@/components/ui";
import { formatInsightDate } from "../lib/format";
import type { Insight } from "../lib/insight-schema";
import { insightsStrings } from "../strings";
import { InsightSummary } from "./insight-summary";

const t = insightsStrings.history;

/** Every stored summary, in the order given (newest first), or the empty state when there is none. */
export function InsightHistory({ insights }: { insights: readonly Insight[] }) {
  if (insights.length === 0) return <EmptyState message={t.empty} />;

  return (
    <div className="flex flex-col gap-12">
      <p className="text-caption text-ink-muted">{t.note}</p>
      <ol aria-label={t.list} className="flex flex-col gap-16">
        {insights.map((insight) => {
          // One summary per range and day, so the pair is unique on the page.
          const id = `insight-${insight.generatedOn}-${insight.rangeDays}`;
          return (
            <li key={id}>
              <Card className="flex flex-col gap-16">
                <div className="flex flex-wrap items-center justify-between gap-8">
                  <h3 className="text-body font-semibold text-ink">
                    <time dateTime={insight.generatedOn}>{formatInsightDate(insight.generatedOn)}</time>
                  </h3>
                  <PillBadge>{t.range(insight.rangeDays)}</PillBadge>
                </div>
                <InsightSummary insight={insight} idPrefix={id} headingLevel={4} />
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
