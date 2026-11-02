import "server-only";
import type { ProgressData } from "@/features/progress/data/load-progress";
import { getDailyMacroTotals } from "@/features/progress/data/progress";
import type { ProgressRange } from "@/features/progress/lib/progress-range";
import { buildInsightInput } from "../lib/insight-input";
import { insightStats, type InsightStats } from "../lib/insight-stats";

/**
 * The numbers shown next to a summary, from progress data the page already
 * read plus the range's macros. They are secondary: a failed read shows the
 * summary without them instead of taking the page down.
 */
export async function loadInsightStats(progress: ProgressData, range: ProgressRange): Promise<InsightStats | null> {
  try {
    const macros = await getDailyMacroTotals(progress.from, progress.to);
    return insightStats(buildInsightInput({ ...progress, rangeDays: range, macros }));
  } catch (error) {
    console.error("[insights] stats read failed", error instanceof Error ? error.message : error);
    return null;
  }
}
