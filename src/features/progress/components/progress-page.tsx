import { requireUser } from "@/features/auth/data/current-user";
import { getStoredInsight } from "@/features/insights/data/insights";
import { appToday } from "@/lib/app-time";
import { requestNow } from "@/lib/request-time";
import { ProgressScreenContainer } from "../containers/progress-screen-container";
import { loadProgressData } from "../data/load-progress";
import { resolveProgressRange } from "../lib/progress-range";

type ProgressPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * Progress route content for ?range=7|30|90 (30 when missing or invalid),
 * ending today in the app time zone, plus today's stored AI summary for the
 * range. Reads per request: must render inside <Suspense>.
 */
export async function ProgressPage({ searchParams }: ProgressPageProps) {
  const [{ range: rangeParam }, now, user] = await Promise.all([searchParams, requestNow(), requireUser()]);
  const today = appToday(now);
  const range = resolveProgressRange(rangeParam);

  const [{ from, to, trend, log, latestKg, history }, insight] = await Promise.all([
    loadProgressData(user.id, range, today),
    getStoredInsight(user.id, range, today),
  ]);

  return (
    <ProgressScreenContainer
      today={today}
      range={range}
      from={from}
      to={to}
      trend={trend}
      log={log}
      latestKg={latestKg}
      history={history}
      insight={insight}
    />
  );
}
