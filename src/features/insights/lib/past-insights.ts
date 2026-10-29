import type { CalendarDate } from "@/domain";
import type { ProgressRange } from "@/features/progress/lib/progress-range";
import type { Insight } from "./insight-schema";

/** The stored summaries minus the one the generate card shows (this range, today), so none is listed twice. */
export function pastInsights(history: Insight[], range: ProgressRange, today: CalendarDate): Insight[] {
  return history.filter((insight) => insight.rangeDays !== range || insight.generatedOn !== today);
}
