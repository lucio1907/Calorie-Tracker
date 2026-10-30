import { MessageCircleQuestion } from "lucide-react";
import { Card } from "@/components/ui";
import { QUESTION_KEYS, type InsightAnswer, type QuestionKey } from "../lib/insight-questions";
import { insightsStrings } from "../strings";

const t = insightsStrings.questions;

type InsightQuestionsProps = {
  /** Today's answers for the range, by question. */
  answers: Partial<Record<QuestionKey, InsightAnswer>>;
  /** The question being answered; every question waits meanwhile (one daily attempt at a time). */
  pending: QuestionKey | null;
  errors: Partial<Record<QuestionKey, string>>;
  onAsk: (question: QuestionKey) => void;
};

function Answer({ answer }: { answer: InsightAnswer }) {
  const tipsId = `insight-question-${answer.question}-tips`;
  return (
    <div className="flex flex-col gap-8">
      <h3 className="text-body font-semibold text-ink">{t.labels[answer.question]}</h3>
      <p className="text-body break-words text-ink">{answer.answer}</p>
      {answer.tips.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h4 id={tipsId} className="text-caption font-semibold tracking-wide text-ink-muted uppercase">
            {t.tips}
          </h4>
          <ul aria-labelledby={tipsId} className="flex list-disc flex-col gap-4 pl-20 text-body text-ink">
            {answer.tips.map((tip, index) => (
              <li key={index} className="break-words">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** The predefined questions of the AI section: a button each, replaced by its answer once there is one. */
export function InsightQuestions({ answers, pending, errors, onAsk }: InsightQuestionsProps) {
  const answered = QUESTION_KEYS.some((question) => answers[question]);
  return (
    <Card aria-labelledby="insight-questions" className="flex flex-col gap-16">
      <div className="flex flex-col gap-4">
        <h2 id="insight-questions" className="flex items-center gap-8 text-body font-semibold text-ink">
          <MessageCircleQuestion aria-hidden="true" size={18} className="shrink-0 text-ink-muted" />
          {t.heading}
        </h2>
        <p className="text-body text-ink-muted">{t.description}</p>
      </div>

      <ul className="flex flex-col gap-12">
        {QUESTION_KEYS.map((question) => {
          const answer = answers[question];
          const error = errors[question];
          return (
            <li key={question} className="flex flex-col gap-8 rounded-cards border border-border bg-surface p-16">
              {answer ? (
                <Answer answer={answer} />
              ) : (
                <>
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() => onAsk(question)}
                    className="min-h-44 rounded-inputs text-left text-body font-medium text-brand underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-ink-muted disabled:no-underline"
                  >
                    {t.labels[question]}
                  </button>
                  {pending === question ? (
                    <p role="status" aria-live="polite" className="animate-pulse text-body text-ink-muted">
                      {t.pending}
                    </p>
                  ) : null}
                  {error ? (
                    <p role="alert" className="text-body text-danger-ink">
                      {error}
                    </p>
                  ) : null}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {answered ? <p className="text-caption text-ink-muted">{t.note}</p> : null}
    </Card>
  );
}
