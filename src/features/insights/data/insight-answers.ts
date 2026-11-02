import "server-only";
import type { CalendarDate } from "@/domain";
import { createClient } from "@/lib/supabase/server";
import {
  answerContentSchema,
  isQuestionKey,
  QUESTION_KEYS,
  type AnswerContent,
  type InsightAnswer,
  type QuestionKey,
} from "../lib/insight-questions";

/*
 * Stored AI answers to the predefined questions (migration insight_answers).
 * Queries run with the caller's session, so RLS limits rows to the caller's
 * own; owner_id is set by the database (default auth.uid()).
 */

/** Postgres unique_violation: one answer per owner, question, range and day. */
const UNIQUE_VIOLATION = "23505";
const COLUMNS = "question, content, model, generated_on, range_days" as const;

type AnswerRow = { question: string; content: unknown; model: string; generated_on: string; range_days: number };

/** A row as the UI shows it; null for an unknown question or content that does not match the schema. */
function toAnswer(row: AnswerRow): InsightAnswer | null {
  const content = answerContentSchema.safeParse(row.content);
  if (!content.success || !isQuestionKey(row.question)) return null;
  return { ...content.data, question: row.question, model: row.model, generatedOn: row.generated_on, rangeDays: row.range_days };
}

/** The caller's answers for `rangeDays` generated on `day`, in question order. */
export async function listAnswers(userId: string, rangeDays: number, day: CalendarDate): Promise<InsightAnswer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("insight_answers")
    .select(COLUMNS)
    .eq("owner_id", userId)
    .eq("range_days", rangeDays)
    .eq("generated_on", day);
  if (error) throw new Error(`insight answers ${rangeDays}d on ${day}: ${error.message}`);

  return data
    .flatMap((row) => toAnswer(row) ?? [])
    .sort((a, b) => QUESTION_KEYS.indexOf(a.question) - QUESTION_KEYS.indexOf(b.question));
}

/** The caller's answer to `question` for `rangeDays` generated on `day`, or null. */
export async function getStoredAnswer(
  userId: string,
  question: QuestionKey,
  rangeDays: number,
  day: CalendarDate,
): Promise<InsightAnswer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("insight_answers")
    .select(COLUMNS)
    .eq("owner_id", userId)
    .eq("question", question)
    .eq("range_days", rangeDays)
    .eq("generated_on", day)
    .maybeSingle();
  if (error) throw new Error(`insight answer ${question} ${rangeDays}d on ${day}: ${error.message}`);

  return data ? toAnswer(data) : null;
}

export type NewAnswer = { question: QuestionKey; rangeDays: number; day: CalendarDate; content: AnswerContent; model: string };

/**
 * Stores a validated answer. When a parallel request already stored one, that
 * one wins and is returned instead (or the new answer, unstored, when the
 * stored row no longer matches the schema), as saveInsight does.
 */
export async function saveAnswer(userId: string, { question, rangeDays, day, content, model }: NewAnswer): Promise<InsightAnswer> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("insight_answers")
    .insert({ question, range_days: rangeDays, generated_on: day, content, model })
    .select(COLUMNS)
    .single();

  if (error?.code === UNIQUE_VIOLATION) {
    const stored = await getStoredAnswer(userId, question, rangeDays, day);
    return stored ?? { ...content, question, model, generatedOn: day, rangeDays };
  }
  if (error) throw new Error(`insert insight answer ${question} ${rangeDays}d on ${day}: ${error.message}`);

  const saved = toAnswer(data);
  if (!saved) throw new Error("stored insight answer does not match the schema");
  return saved;
}
