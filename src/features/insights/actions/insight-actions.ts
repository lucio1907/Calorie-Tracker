"use server";

import { getCurrentUser } from "@/features/auth/data/current-user";
import type { ActionResult } from "@/features/foods/lib/types";
import { loadProgressData } from "@/features/progress/data/load-progress";
import { getDailyMacroTotals } from "@/features/progress/data/progress";
import { PROGRESS_RANGES, rangeBounds } from "@/features/progress/lib/progress-range";
import { appToday } from "@/lib/app-time";
import { getStoredInsight, InsightLimitError, saveInsight, takeInsightSlot } from "../data/insights";
import { InsightRateLimitedError, InsightUnavailableError, requestInsightCompletion } from "../data/openrouter";
import { buildInsightInput } from "../lib/insight-input";
import { buildInsightMessages } from "../lib/insight-prompt";
import { insightContentSchema, type Insight } from "../lib/insight-schema";
import { insightsStrings } from "../strings";

const t = insightsStrings.errors;

/*
 * One AI summary per user, range and app day. The client sends only the
 * range; the numbers are read again on the server with the caller's session
 * (the same loader as the Progress screen) and only aggregates reach the
 * model. Order matters for the shared free quota: a stored summary or a range
 * without logged food never takes a slot nor calls OpenRouter. Prompts and
 * answers are never logged.
 */

/** Generates (or returns today's stored) summary for the last `rangeDays` days. */
export async function generateInsight(rangeDays: number): Promise<ActionResult<Insight>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t.unauthorized };

  const range = PROGRESS_RANGES.find((candidate) => candidate === rangeDays);
  if (range === undefined) return { ok: false, error: t.invalidRange };

  const today = appToday(new Date());
  try {
    const stored = await getStoredInsight(user.id, range, today);
    if (stored) return { ok: true, data: stored };

    const { from, to } = rangeBounds(range, today);
    const [progress, macros] = await Promise.all([loadProgressData(user.id, range, today), getDailyMacroTotals(from, to)]);
    if (progress.history.loggedDays === 0) return { ok: false, error: t.notEnoughData };

    await takeInsightSlot();
    const input = buildInsightInput({ ...progress, rangeDays: range, macros });
    const answer = await requestInsightCompletion(buildInsightMessages(input));
    const content = insightContentSchema.safeParse(answer.content);
    if (!content.success) return { ok: false, error: t.unavailable };

    const insight = await saveInsight(user.id, { rangeDays: range, day: today, content: content.data, model: answer.model });
    return { ok: true, data: insight };
  } catch (error) {
    if (error instanceof InsightLimitError) return { ok: false, error: t.dailyLimit };
    if (error instanceof InsightRateLimitedError) return { ok: false, error: t.busy };
    if (error instanceof InsightUnavailableError) return { ok: false, error: t.unavailable };
    console.error("[insights] generation failed", error instanceof Error ? error.message : error);
    return { ok: false, error: t.unexpected };
  }
}
