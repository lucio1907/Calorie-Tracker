"use server";

import { getCurrentUser } from "@/features/auth/data/current-user";
import type { ActionResult } from "@/features/foods/lib/types";
import { loadProgressData } from "@/features/progress/data/load-progress";
import { getDailyMacroTotals } from "@/features/progress/data/progress";
import type { CalendarDate } from "@/domain";
import { PROGRESS_RANGES, rangeBounds, type ProgressRange } from "@/features/progress/lib/progress-range";
import { appToday } from "@/lib/app-time";
import { getStoredAnswer, saveAnswer } from "../data/insight-answers";
import { getPreviousInsight, getStoredInsight, InsightLimitError, saveInsight, takeInsightSlot } from "../data/insights";
import { InsightRateLimitedError, InsightUnavailableError, requestInsightCompletion } from "../data/openrouter";
import { getOpenRouterApiKey } from "../data/openrouter-env";
import { buildInsightInput, type InsightInput } from "../lib/insight-input";
import { buildInsightMessages } from "../lib/insight-prompt";
import { answerContentSchema, isQuestionKey, type InsightAnswer, type QuestionKey } from "../lib/insight-questions";
import { insightContentSchema, type Insight } from "../lib/insight-schema";
import { previousBlock, previousWindow } from "../lib/previous-insight";
import { buildQuestionMessages } from "../lib/question-prompt";
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

/** The range's numbers on `day`, read like the Progress screen, plus the day-by-day macros. */
async function rangeInput(userId: string, range: ProgressRange, day: CalendarDate) {
  const { from, to } = rangeBounds(range, day);
  const [progress, macros] = await Promise.all([loadProgressData(userId, range, day), getDailyMacroTotals(from, to)]);
  return { progress, macros };
}

/**
 * The previous summary of the range with the numbers of the period it
 * covered (read again: edits since then count). It is secondary: a failed
 * read leaves it out instead of failing the generation.
 */
async function loadPrevious(userId: string, range: ProgressRange, today: CalendarDate): Promise<InsightInput["previous"]> {
  try {
    const previous = await getPreviousInsight(userId, range, previousWindow(range, today));
    if (!previous) return null;
    const { progress, macros } = await rangeInput(userId, range, previous.generatedOn);
    return previousBlock(previous, buildInsightInput({ ...progress, rangeDays: range, macros }), today);
  } catch (error) {
    console.error("[insights] previous summary read failed", error instanceof Error ? error.message : error);
    return null;
  }
}

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

    const { progress, macros } = await rangeInput(user.id, range, today);
    if (progress.history.loggedDays === 0) return { ok: false, error: t.notEnoughData };
    const previous = await loadPrevious(user.id, range, today);

    // A missing key fails here, before it can spend one of the day's generations.
    getOpenRouterApiKey();
    await takeInsightSlot();
    const input = buildInsightInput({ ...progress, rangeDays: range, macros, previous });
    const answer = await requestInsightCompletion(buildInsightMessages(input));
    const content = insightContentSchema.safeParse(answer.content);
    if (!content.success) return { ok: false, error: t.unavailable };

    const insight = await saveInsight(user.id, { rangeDays: range, day: today, content: content.data, model: answer.model });
    return { ok: true, data: insight };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Answers (or returns today's stored answer to) one predefined question about
 * the last `rangeDays` days. Same order and quota as generateInsight: a stored
 * answer or a range without logged food never takes a slot nor calls the model.
 */
export async function askInsightQuestion(rangeDays: number, question: QuestionKey): Promise<ActionResult<InsightAnswer>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t.unauthorized };

  const range = PROGRESS_RANGES.find((candidate) => candidate === rangeDays);
  if (range === undefined) return { ok: false, error: t.invalidRange };
  // The client sends the key; anything else never reaches the database or the model.
  if (!isQuestionKey(question)) return { ok: false, error: t.invalidQuestion };

  const today = appToday(new Date());
  try {
    const stored = await getStoredAnswer(user.id, question, range, today);
    if (stored) return { ok: true, data: stored };

    const { progress, macros } = await rangeInput(user.id, range, today);
    if (progress.history.loggedDays === 0) return { ok: false, error: t.notEnoughDataAnswer };

    getOpenRouterApiKey();
    await takeInsightSlot();
    const input = buildInsightInput({ ...progress, rangeDays: range, macros });
    const answer = await requestInsightCompletion(buildQuestionMessages(input, question));
    const content = answerContentSchema.safeParse(answer.content);
    if (!content.success) return { ok: false, error: t.unavailable };

    const saved = await saveAnswer(user.id, { question, rangeDays: range, day: today, content: content.data, model: answer.model });
    return { ok: true, data: saved };
  } catch (error) {
    return failure(error);
  }
}

/** The message for a failed generation; unexpected errors are logged without prompts or answers. */
function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof InsightLimitError) return { ok: false, error: t.dailyLimit };
  if (error instanceof InsightRateLimitedError) return { ok: false, error: t.busy };
  if (error instanceof InsightUnavailableError) return { ok: false, error: t.unavailable };
  console.error("[insights] generation failed", error instanceof Error ? error.message : error);
  return { ok: false, error: t.unexpected };
}
