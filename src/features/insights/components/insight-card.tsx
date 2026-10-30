import { Sparkles } from "lucide-react";
import { Button, Card, cn, PillBadge, ProgressBar } from "@/components/ui";
import { formatShortDate, formatSignedKcal } from "@/features/progress/lib/format";
import type { Insight } from "../lib/insight-schema";
import type { InsightStats, MacroKey } from "../lib/insight-stats";
import { insightsStrings as t } from "../strings";
import { InsightSummary } from "./insight-summary";

type InsightCardProps = {
  /** Today's stored summary for the range; null until one is generated. */
  insight: Insight | null;
  /** The range's numbers, shown next to the summary; null when they could not be read. */
  stats?: InsightStats | null;
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

const MACRO_BARS: Record<MacroKey, string> = { protein: "bg-protein", carbs: "bg-carbs", fat: "bg-fat" };

/** Share of `target` reached, 0 to 1 (a full bar once reached). */
function share(average: number, target: number): number {
  return target > 0 ? Math.min(1, average / target) : 0;
}

/** Goal status (a dot plus a label, never color alone), the average balance and the macro bars. */
function Stats({ stats }: { stats: InsightStats }) {
  const helps = stats.balanceVsGoal === "a favor de la meta";
  return (
    <section aria-labelledby="insight-stats" className="flex flex-col gap-12 rounded-cards border border-border bg-surface p-16">
      <h3 id="insight-stats" className="text-caption font-semibold tracking-wide text-ink-muted uppercase">
        {t.stats.heading}
      </h3>
      {stats.balanceVsGoal !== null ? (
        <div className="flex flex-col items-start gap-4">
          <PillBadge className="gap-4">
            <span aria-hidden="true" className={cn("size-6 rounded-full", helps ? "bg-brand" : "bg-over")} />
            {helps ? t.stats.goalFor : t.stats.goalAgainst}
          </PillBadge>
          {stats.averageBalanceKcal !== null ? (
            <p className="tabular text-body text-ink-muted">{t.stats.balance(formatSignedKcal(stats.averageBalanceKcal))}</p>
          ) : null}
        </div>
      ) : null}
      {stats.macros.length > 0 ? (
        <ul aria-label={t.stats.macrosHeading} className="flex flex-col gap-12">
          {stats.macros.map((macro) => (
            <li key={macro.key} className="flex flex-col gap-4">
              <div className="flex justify-between gap-8 text-body">
                <span className="flex items-center gap-8 text-ink">
                  <span aria-hidden="true" className={cn("size-10 rounded-[3px]", MACRO_BARS[macro.key])} />
                  {t.stats.macros[macro.key]}
                </span>
                <span className="tabular text-ink-muted">
                  {macro.targetG === null ? `${macro.averageG} g` : `${macro.averageG} / ${macro.targetG} g`}
                </span>
              </div>
              {macro.targetG !== null ? (
                <ProgressBar value={share(macro.averageG, macro.targetG)} fillClassName={MACRO_BARS[macro.key]} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Text first; on wide screens the numbers sit next to it. */
function Summary({ insight, stats }: { insight: Insight; stats: InsightStats | null }) {
  return (
    <div className="flex flex-col gap-16">
      <div className={cn("grid gap-16", stats && "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start")}>
        <InsightSummary insight={insight} idPrefix="insight" headingLevel={3} />
        {stats ? <Stats stats={stats} /> : null}
      </div>
      <p className="text-caption text-ink-muted">{t.note(formatShortDate(insight.generatedOn))}</p>
    </div>
  );
}

/** AI summary card on Progress: the stored summary for the range, or the button that generates it. */
export function InsightCard({ insight, stats = null, pending, error, onGenerate }: InsightCardProps) {
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
        <Summary insight={insight} stats={stats} />
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
