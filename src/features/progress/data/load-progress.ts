import "server-only";
import { addDays, type CalendarDate } from "@/domain";
import type { WeightLogRow } from "../components/weight-entry-list";
import { buildCalorieHistory, type CalorieHistory } from "../lib/calorie-history";
import type { ProfileVersion } from "../lib/profile-history";
import { rangeBounds, type ProgressRange } from "../lib/progress-range";
import type { WeightEntry } from "../lib/types";
import { buildWeightTrend, MOVING_AVERAGE_DAYS, weightOnOrBefore, withChangeFromPrevious, type WeightTrend } from "../lib/weight-trend";
import { getDailyEnergyTotals, getProfileVersions, getWeightBefore, getWeightEntries } from "./progress";

/** Everything the Progress screen (and the AI insight built from it) reads for one range. */
export type ProgressData = {
  from: CalendarDate;
  to: CalendarDate;
  /** Weights oldest first: the latest one before the moving-average window, then every one from it to `to`. */
  weights: WeightEntry[];
  /** Profile versions covering the range, oldest first. */
  profiles: ProfileVersion[];
  trend: WeightTrend;
  /** Weights inside the range with their change from the previous one, newest first. */
  log: WeightLogRow[];
  /** Latest weight on or before `today`; null when none. */
  latestKg: number | null;
  history: CalorieHistory;
};

/**
 * The caller's Progress numbers for the range ending `today`. The one place
 * these reads happen, so the screen and the AI insight see the same numbers.
 */
export async function loadProgressData(userId: string, range: ProgressRange, today: CalendarDate): Promise<ProgressData> {
  const { from, to } = rangeBounds(range, today);
  // A week before the range feeds the first days' moving average; the latest
  // weight before that gives early days a target and the first entry a change.
  const since = addDays(from, -(MOVING_AVERAGE_DAYS - 1));

  const [recent, before, totals, profiles] = await Promise.all([
    getWeightEntries(userId, since, to),
    getWeightBefore(userId, since),
    getDailyEnergyTotals(from, to),
    // Past days are scored against the profile as it was then, not today's.
    getProfileVersions(userId, from, to),
  ]);
  const weights = before ? [before, ...recent] : recent;

  return {
    from,
    to,
    weights,
    profiles,
    trend: buildWeightTrend(weights, from, to),
    log: withChangeFromPrevious(weights).filter((entry) => entry.date >= from),
    latestKg: weightOnOrBefore(weights, today)?.kg ?? null,
    history: buildCalorieHistory({ from, to, totals, profiles, weights }),
  };
}
