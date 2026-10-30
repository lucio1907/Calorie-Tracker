"use client";

import { useRef, useState, useTransition } from "react";
import type { ProgressRange } from "@/features/progress/lib/progress-range";
import { askInsightQuestion } from "../actions/insight-actions";
import { InsightQuestions } from "../components/insight-questions";
import type { InsightAnswer, QuestionKey } from "../lib/insight-questions";
import { insightsStrings } from "../strings";

type InsightQuestionsContainerProps = {
  range: ProgressRange;
  /** Today's stored answers for the range, read by the page. */
  initialAnswers: InsightAnswer[];
};

/**
 * Asks the predefined questions on demand. Render it keyed by range, like the
 * summary card: each range keeps its own answers and errors. Answers are
 * stored server-side, so a reload shows them again.
 */
export function InsightQuestionsContainer({ range, initialAnswers }: InsightQuestionsContainerProps) {
  const [answers, setAnswers] = useState<Partial<Record<QuestionKey, InsightAnswer>>>(() =>
    Object.fromEntries(initialAnswers.map((answer) => [answer.question, answer])),
  );
  const [errors, setErrors] = useState<Partial<Record<QuestionKey, string>>>({});
  const [pending, setPending] = useState<QuestionKey | null>(null);
  const [, startAsk] = useTransition();
  // Set synchronously: clicks that land before the disabled buttons render must not spend more attempts.
  const asking = useRef(false);

  function ask(question: QuestionKey) {
    if (asking.current) return;
    asking.current = true;
    setPending(question);
    setErrors((current) => ({ ...current, [question]: undefined }));
    startAsk(async () => {
      try {
        const result = await askInsightQuestion(range, question);
        if (result.ok) setAnswers((current) => ({ ...current, [question]: result.data }));
        else setErrors((current) => ({ ...current, [question]: result.error }));
      } catch {
        // The request itself failed (network, server action error): nothing was answered.
        setErrors((current) => ({ ...current, [question]: insightsStrings.errors.unexpected }));
      } finally {
        // Every question waits on this one; always let them be asked again.
        asking.current = false;
        setPending(null);
      }
    });
  }

  return <InsightQuestions answers={answers} pending={pending} errors={errors} onAsk={ask} />;
}
