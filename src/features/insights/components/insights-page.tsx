import { PageHeader } from "@/components/ui";
import { requireUser } from "@/features/auth/data/current-user";
import { loadProgressData } from "@/features/progress/data/load-progress";
import { resolveProgressRange } from "@/features/progress/lib/progress-range";
import { appToday } from "@/lib/app-time";
import { requestNow } from "@/lib/request-time";
import { InsightCardContainer } from "../containers/insight-card-container";
import { InsightQuestionsContainer } from "../containers/insight-questions-container";
import { listAnswers } from "../data/insight-answers";
import { getStoredInsightOrNull, listInsights } from "../data/insights";
import { loadInsightStats } from "../data/insight-stats";
import { pastInsights } from "../lib/past-insights";
import { insightsStrings as t } from "../strings";
import { InsightHistory } from "./insight-history";
import { InsightRangeNav } from "./insight-range-nav";

type InsightsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * AI section route content: the generate card for ?range=7|30|90 (30 when
 * missing or invalid, as on Progress) with the range's numbers, the
 * predefined questions with today's answers, then every stored summary,
 * newest first. Reads per request: must render inside <Suspense>.
 */
export async function InsightsPage({ searchParams }: InsightsPageProps) {
  const [{ range: rangeParam }, now, user] = await Promise.all([searchParams, requestNow(), requireUser()]);
  const today = appToday(now);
  const range = resolveProgressRange(rangeParam);

  const [insight, history, stats, answers] = await Promise.all([
    getStoredInsightOrNull(user.id, range, today),
    // The history is secondary: a failed read shows a message, the generate card still works.
    listInsights(user.id).catch((error: unknown) => {
      console.error("[insights] history read failed", error);
      return null;
    }),
    // The numbers next to the summary are secondary too: without them the card shows the text only.
    loadProgressData(user.id, range, today).then(
      (progress) => loadInsightStats(progress, range),
      (error: unknown) => {
        console.error("[insights] progress read failed", error);
        return null;
      },
    ),
    // Without today's stored answers every question shows its button; asking returns the stored one.
    listAnswers(user.id, range, today).catch((error: unknown) => {
      console.error("[insights] answers read failed", error);
      return [];
    }),
  ]);

  return (
    <div className="stagger flex flex-col gap-24">
      <PageHeader title={t.page.title} description={t.page.description} />

      <div className="flex flex-col gap-16">
        <InsightRangeNav range={range} />
        {/* Keyed by range: each range has its own summary, pending state and error. */}
        <InsightCardContainer key={range} range={range} initialInsight={insight} stats={stats} />
        <InsightQuestionsContainer key={`questions-${range}`} range={range} initialAnswers={answers} />
      </div>

      <section aria-labelledby="insight-history" className="flex flex-col gap-12">
        <h2 id="insight-history" className="text-body-lg font-semibold text-ink">
          {t.history.heading}
        </h2>
        <InsightHistory insights={history && pastInsights(history, range, today)} />
      </section>
    </div>
  );
}
