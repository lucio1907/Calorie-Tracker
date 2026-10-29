import { Sparkles } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { formatShortDate } from "@/features/progress/lib/format";
import type { Insight } from "../lib/insight-schema";
import { insightsStrings as t } from "../strings";
import { InsightSummary } from "./insight-summary";

type InsightCardProps = {
  /** Today's stored summary for the range; null until one is generated. */
  insight: Insight | null;
  pending: boolean;
  error: string | null;
  onGenerate: () => void;
};

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-surface-alt ${className}`} />;
}

/** Placeholder while the model writes (a few seconds): bars shaped like the summary, plus the pending text. */
function PendingPlaceholder() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-12">
      <span className="text-body text-ink-muted">{t.pending}</span>
      <div aria-hidden="true" className="flex flex-col gap-12 rounded-cards border border-border bg-surface p-16">
        <Bar className="h-14 w-1/3" />
        <Bar className="h-10 w-full" />
        <Bar className="h-10 w-4/5" />
        <Bar className="h-14 w-1/4" />
        <Bar className="h-10 w-full" />
      </div>
    </div>
  );
}

function Summary({ insight }: { insight: Insight }) {
  return (
    <div className="flex flex-col gap-16">
      <InsightSummary insight={insight} idPrefix="insight" headingLevel={3} />
      <p className="text-caption text-ink-muted">{t.note(formatShortDate(insight.generatedOn))}</p>
    </div>
  );
}

/** AI summary card on Progress: the stored summary for the range, or the button that generates it. */
export function InsightCard({ insight, pending, error, onGenerate }: InsightCardProps) {
  return (
    <Card aria-labelledby="progress-insight" className="flex flex-col gap-16">
      <div className="flex flex-col gap-4">
        <h2 id="progress-insight" className="flex items-center gap-8 text-body font-semibold text-ink">
          <Sparkles aria-hidden="true" size={18} className="shrink-0 text-ink-muted" />
          {t.title}
        </h2>
        <p className="text-body text-ink-muted">{t.description}</p>
      </div>

      {insight ? (
        <Summary insight={insight} />
      ) : (
        <>
          {pending ? <PendingPlaceholder /> : null}
          {error ? (
            <p role="alert" className="text-body text-danger-ink">
              {error}
            </p>
          ) : null}
          <Button variant="outline" className="self-start" disabled={pending} onClick={onGenerate}>
            {pending ? t.pending : t.generate}
          </Button>
        </>
      )}
    </Card>
  );
}
