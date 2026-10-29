import { ButtonLink, Card, ProgressBar } from "@/components/ui";
import { formatKcal } from "@/features/foods/lib/format";
import type { TodaySummary } from "@/features/today/lib/today-summary";
import { diaryStrings } from "../strings";

const t = diaryStrings.target;

/**
 * The day's calorie budget beside the date: kcal left (or over) out of the
 * target plus that day's exercise, the same balance Today shows, with the
 * profile and weight that applied on the day.
 */
export function DayTarget({ summary }: { summary: TodaySummary }) {
  if (summary.status !== "ready") {
    return (
      <Card aria-labelledby="diary-day-target" className="flex flex-wrap items-center justify-between gap-12">
        <div className="flex min-w-0 flex-col gap-4">
          <h2 id="diary-day-target" className="text-caption font-semibold tracking-wide text-ink-muted uppercase">
            {t.heading}
          </h2>
          <p className="text-body text-ink-muted">{summary.status === "underage" ? t.underage : t.incomplete}</p>
        </div>
        {summary.status === "incomplete" ? <ButtonLink href="/settings">{t.completeProfile}</ButtonLink> : null}
      </Card>
    );
  }

  const over = summary.remainingKcal < 0;
  const budget = summary.targetKcal + summary.exerciseKcal;

  return (
    <Card aria-labelledby="diary-day-target" className="flex flex-col justify-center gap-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-12 gap-y-4">
        <h2 id="diary-day-target" className="text-caption font-semibold tracking-wide text-ink-muted uppercase">
          {t.heading}
        </h2>
        <p className="flex items-baseline gap-4 text-body">
          <span className="text-ink-muted">{over ? t.over : t.remaining}</span>
          <span className={`tabular text-body-xl font-semibold ${over ? "text-danger-ink" : "text-ink"}`}>
            {formatKcal(Math.abs(summary.remainingKcal))}
          </span>
          <span className="text-caption text-ink-muted">{diaryStrings.nutrients.kcal}</span>
        </p>
      </div>
      {/* Food eaten out of the day's budget (target + exercise); the numbers say the same. */}
      <ProgressBar
        value={budget > 0 ? summary.consumed.kcal / budget : 0}
        fillClassName={over ? "bg-over" : "bg-consumed"}
      />
      <p className="flex flex-wrap justify-between gap-x-12 text-caption text-ink-muted">
        <span className="tabular">{t.eaten(formatKcal(summary.consumed.kcal), formatKcal(summary.targetKcal))}</span>
        {summary.exerciseKcal > 0 ? (
          <span className="tabular text-burned-ink">{t.exercise(formatKcal(summary.exerciseKcal))}</span>
        ) : null}
      </p>
    </Card>
  );
}
