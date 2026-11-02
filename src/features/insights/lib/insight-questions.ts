import { z } from "zod";
import type { CalendarDate } from "@/domain";

/** The predefined questions, in display order; the database accepts only these (migration insight_answers). */
export const QUESTION_KEYS = ["weight", "protein", "weekend", "consistency"] as const;

export type QuestionKey = (typeof QUESTION_KEYS)[number];

export function isQuestionKey(value: unknown): value is QuestionKey {
  return typeof value === "string" && (QUESTION_KEYS as readonly string[]).includes(value);
}

/** What the prompt asks the model for. */
export const ANSWER_LIMITS = { answer: 600, tip: 200, tips: 3 } as const;

/** What is accepted: like the summary, a little over the asked lengths still counts (insight-schema.ts). */
const HARD_LIMITS = { answer: 1200, tip: 300, tips: 10 } as const;

/** The JSON object the model must answer (see question-prompt.ts); unknown keys are dropped. */
export const answerContentSchema = z.object({
  answer: z.string().trim().min(1).max(HARD_LIMITS.answer),
  tips: z
    .array(z.string().trim().min(1).max(HARD_LIMITS.tip))
    .max(HARD_LIMITS.tips)
    .transform((list) => list.slice(0, ANSWER_LIMITS.tips)),
});

export type AnswerContent = z.infer<typeof answerContentSchema>;

/** A stored answer, as the UI shows it. */
export type InsightAnswer = AnswerContent & {
  question: QuestionKey;
  /** The OpenRouter model that wrote it. */
  model: string;
  /** App day it was generated for. */
  generatedOn: CalendarDate;
  rangeDays: number;
};
