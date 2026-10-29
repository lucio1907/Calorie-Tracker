import { z } from "zod";
import type { CalendarDate } from "@/domain";

/** What the prompt asks the model for. */
export const INSIGHT_LIMITS = { overview: 400, item: 200, items: 3 } as const;

/**
 * What is accepted: models run over the asked lengths now and then (a live
 * check had a 3-sentence overview past 400), and a rejected answer still
 * spends the user's daily attempt. Extra items are dropped instead of
 * rejected. At these caps a stored summary stays below the 8 KiB content cap.
 */
const HARD_LIMITS = { overview: 800, item: 300, items: 10 } as const;

const item = z.string().trim().min(1).max(HARD_LIMITS.item);
const items = z
  .array(item)
  .max(HARD_LIMITS.items)
  .transform((list) => list.slice(0, INSIGHT_LIMITS.items));

/**
 * The JSON object the model must answer (see insight-prompt.ts). Anything
 * else is treated as an unavailable answer; unknown keys are dropped, so only
 * these fields are ever stored or shown.
 */
export const insightContentSchema = z.object({
  overview: z.string().trim().min(1).max(HARD_LIMITS.overview),
  wins: items,
  improvements: items,
});

export type InsightContent = z.infer<typeof insightContentSchema>;

/** A stored summary, as the UI shows it. */
export type Insight = InsightContent & {
  /** The OpenRouter model that wrote it. */
  model: string;
  /** App day it was generated for. */
  generatedOn: CalendarDate;
  rangeDays: number;
};
