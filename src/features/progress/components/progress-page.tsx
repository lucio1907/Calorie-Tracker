import { addDays } from "@/domain";
import { requireUser } from "@/features/auth/data/current-user";
import { getTodayProfile } from "@/features/today/data/today";
import { appToday } from "@/lib/app-time";
import { requestNow } from "@/lib/request-time";
import { ProgressScreenContainer } from "../containers/progress-screen-container";
import { getDailyEnergyTotals, getWeightBefore, getWeightEntries } from "../data/progress";
import { buildCalorieHistory } from "../lib/calorie-history";
import { rangeBounds, resolveProgressRange } from "../lib/progress-range";
import { buildWeightTrend, MOVING_AVERAGE_DAYS, weightOnOrBefore, withChangeFromPrevious } from "../lib/weight-trend";

type ProgressPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * Progress route content for ?range=7|30|90 (30 when missing or invalid),
 * ending today in the app time zone. Reads per request: must render inside
 * <Suspense>.
 */
export async function ProgressPage({ searchParams }: ProgressPageProps) {
  const [{ range: rangeParam }, now, user] = await Promise.all([searchParams, requestNow(), requireUser()]);
  const today = appToday(now);
  const range = resolveProgressRange(rangeParam);
  const { from, to } = rangeBounds(range, today);
  // A week before the range feeds the first days' moving average; the latest
  // weight before that gives early days a target and the first entry a change.
  const since = addDays(from, -(MOVING_AVERAGE_DAYS - 1));

  const [recent, before, totals, profile] = await Promise.all([
    getWeightEntries(user.id, since, to),
    getWeightBefore(user.id, since),
    getDailyEnergyTotals(from, to),
    getTodayProfile(user.id),
  ]);
  const weights = before ? [before, ...recent] : recent;

  return (
    <ProgressScreenContainer
      today={today}
      range={range}
      from={from}
      to={to}
      trend={buildWeightTrend(weights, from, to)}
      log={withChangeFromPrevious(weights).filter((entry) => entry.date >= from)}
      latestKg={weightOnOrBefore(weights, today)?.kg ?? null}
      history={buildCalorieHistory({ from, to, totals, profile, weights })}
    />
  );
}
