import { DEFAULT_PROGRESS_RANGE, type ProgressRange } from "@/features/progress/lib/progress-range";

/** The AI section's route. */
export const INSIGHTS_PATH = "/insights";

/** URL of the AI section with the generate card on a range; the default range (Progress's) is the bare path. */
export function insightsHref(range: ProgressRange): string {
  return range === DEFAULT_PROGRESS_RANGE ? INSIGHTS_PATH : `${INSIGHTS_PATH}?range=${range}`;
}
