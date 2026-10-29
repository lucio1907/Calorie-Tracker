import "server-only";
import type { CalendarDate } from "@/domain";
import { createClient } from "@/lib/supabase/server";
import { insightContentSchema, type Insight, type InsightContent } from "../lib/insight-schema";

/*
 * Stored AI summaries and the per-user daily generation limit (migration
 * ai_insights). Queries run with the caller's session, so RLS limits rows to
 * the caller's own; owner_id is set by the database (default auth.uid()).
 */

/** The caller already used today's generations; OpenRouter was not called. */
export class InsightLimitError extends Error {
  constructor() {
    super("Daily AI insight limit reached for this user");
    this.name = "InsightLimitError";
  }
}

/** Postgres unique_violation: one summary per owner, range and day. */
const UNIQUE_VIOLATION = "23505";
const COLUMNS = "content, model, generated_on, range_days" as const;

type InsightRow = { content: unknown; model: string; generated_on: string; range_days: number };

/** A row as the UI shows it; null when its content does not match the schema (never shown half-valid). */
function toInsight(row: InsightRow): Insight | null {
  const content = insightContentSchema.safeParse(row.content);
  if (!content.success) return null;
  return { ...content.data, model: row.model, generatedOn: row.generated_on, rangeDays: row.range_days };
}

/** The caller's summary for `rangeDays` generated on `day`, or null. */
export async function getStoredInsight(userId: string, rangeDays: number, day: CalendarDate): Promise<Insight | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("insights")
    .select(COLUMNS)
    .eq("owner_id", userId)
    .eq("range_days", rangeDays)
    .eq("generated_on", day)
    .maybeSingle();
  if (error) throw new Error(`insight ${rangeDays}d on ${day}: ${error.message}`);

  return data ? toInsight(data) : null;
}

/**
 * getStoredInsight for the Progress screen: a failed read (e.g. the code
 * deployed before the insights migration) shows the generate button instead
 * of taking the whole screen down with it.
 */
export async function getStoredInsightOrNull(userId: string, rangeDays: number, day: CalendarDate): Promise<Insight | null> {
  try {
    return await getStoredInsight(userId, rangeDays, day);
  } catch (error) {
    console.error("[insights] stored summary read failed", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Takes one of the caller's daily generations. Throws InsightLimitError when none is left. */
export async function takeInsightSlot(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_insight_request");
  if (error) throw new Error(`consume_insight_request failed: ${error.message}`);
  if (!data) throw new InsightLimitError();
}

export type NewInsight = { rangeDays: number; day: CalendarDate; content: InsightContent; model: string };

/**
 * Stores a validated summary. When a parallel request already stored one for
 * the same range and day, that one wins and is returned instead; if that row
 * no longer matches the schema, the new summary is returned unstored rather
 * than failing after the generation was spent.
 */
export async function saveInsight(userId: string, { rangeDays, day, content, model }: NewInsight): Promise<Insight> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("insights")
    .insert({ range_days: rangeDays, generated_on: day, content, model })
    .select(COLUMNS)
    .single();

  if (error?.code === UNIQUE_VIOLATION) {
    const stored = await getStoredInsight(userId, rangeDays, day);
    return stored ?? { ...content, model, generatedOn: day, rangeDays };
  }
  if (error) throw new Error(`insert insight ${rangeDays}d on ${day}: ${error.message}`);

  const saved = toInsight(data);
  if (!saved) throw new Error("stored insight does not match the schema");
  return saved;
}
