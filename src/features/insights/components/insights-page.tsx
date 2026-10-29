import { PageHeader } from "@/components/ui";
import { requireUser } from "@/features/auth/data/current-user";
import { resolveProgressRange } from "@/features/progress/lib/progress-range";
import { appToday } from "@/lib/app-time";
import { requestNow } from "@/lib/request-time";
import { InsightCardContainer } from "../containers/insight-card-container";
import { getStoredInsightOrNull, listInsights } from "../data/insights";
import { pastInsights } from "../lib/past-insights";
import { insightsStrings as t } from "../strings";
import { InsightHistory } from "./insight-history";
import { InsightRangeNav } from "./insight-range-nav";

type InsightsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * AI section route content: the generate card for ?range=7|30|90 (30 when
 * missing or invalid, as on Progress), then every stored summary, newest
 * first. Reads per request: must render inside <Suspense>.
 */
export async function InsightsPage({ searchParams }: InsightsPageProps) {
  const [{ range: rangeParam }, now, user] = await Promise.all([searchParams, requestNow(), requireUser()]);
  const today = appToday(now);
  const range = resolveProgressRange(rangeParam);

  const [insight, history] = await Promise.all([getStoredInsightOrNull(user.id, range, today), listInsights(user.id)]);

  return (
    <div className="stagger flex flex-col gap-24">
      <PageHeader title={t.page.title} description={t.page.description} />

      <div className="flex flex-col gap-16">
        <InsightRangeNav range={range} />
        {/* Keyed by range: each range has its own summary, pending state and error. */}
        <InsightCardContainer key={range} range={range} initialInsight={insight} />
      </div>

      <section aria-labelledby="insight-history" className="flex flex-col gap-12">
        <h2 id="insight-history" className="text-body-lg font-semibold text-ink">
          {t.history.heading}
        </h2>
        <InsightHistory insights={pastInsights(history, range, today)} />
      </section>
    </div>
  );
}
