import { Plus } from "lucide-react";
import type { ComponentProps } from "react";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatAmount, formatKcal } from "@/features/foods/lib/format";
import type { TodaySummary } from "../lib/today-summary";
import { todayStrings as t } from "../strings";

type ReadySummary = Extract<TodaySummary, { status: "ready" }>;

const MACROS = [
  { key: "protein", label: t.macros.protein, barClass: "bg-protein" },
  { key: "carbs", label: t.macros.carbs, barClass: "bg-carbs" },
  { key: "fat", label: t.macros.fat, barClass: "bg-fat" },
] as const;

const rateFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, useGrouping: false });

type BreakdownItem = { label: string; value: number };

/**
 * TDEE, the goal's daily adjustment (none while maintaining), the raise to the
 * safe minimum (only when applied) and the resulting target.
 */
function targetBreakdown(summary: ReadySummary): BreakdownItem[] {
  const items: BreakdownItem[] = [{ label: t.targetBreakdown.tdee, value: summary.tdeeKcal }];
  if (summary.goal !== "maintain") {
    const rate = rateFormat.format(summary.goalKgPerWeek);
    items.push({
      label: summary.goal === "lose" ? t.targetBreakdown.lose(rate) : t.targetBreakdown.gain(rate),
      value: Math.abs(summary.goalAdjustmentKcal),
    });
  }
  if (summary.floorRaiseKcal > 0) {
    items.push({ label: t.targetBreakdown.floor(formatKcal(summary.minimumKcal)), value: summary.floorRaiseKcal });
  }
  items.push({ label: t.targetBreakdown.target, value: summary.targetKcal });
  return items;
}

function Breakdown({ items, ...props }: { items: BreakdownItem[] } & ComponentProps<"dl">) {
  return (
    <dl className="tabular grid grid-cols-2 gap-8 text-body sm:flex sm:flex-wrap sm:items-center sm:gap-12" {...props}>
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-4">
          <dt className="text-ink-muted">{item.label}</dt>
          <dd className="text-ink">{formatKcal(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Share of the target reached, as a CSS width capped at 100%. */
function barWidth(consumed: number, target: number): string {
  if (target <= 0) return "0%";
  return `${Math.min(100, (consumed / target) * 100)}%`;
}

function BalanceCard({ summary }: { summary: ReadySummary }) {
  const over = summary.remainingKcal < 0;
  const equation = [
    { label: t.equation.target, value: summary.targetKcal },
    { label: t.equation.exercise, value: summary.exerciseKcal },
    { label: t.equation.food, value: summary.consumed.kcal },
    { label: t.equation.remaining, value: summary.remainingKcal },
  ];

  return (
    <Card aria-labelledby="today-remaining" className="flex flex-col gap-16">
      <div className="flex flex-col gap-4">
        <h2 id="today-remaining" className="text-caption font-semibold tracking-wide text-ink-muted uppercase">
          {over ? t.overLabel : t.remainingLabel}
        </h2>
        <p className="flex items-baseline gap-8">
          <span
            className={`display-text text-heading-lg tabular-nums md:text-display ${over ? "text-danger-ink" : "text-ink"}`}
          >
            {formatKcal(Math.abs(summary.remainingKcal))}
          </span>
          <span className="text-body text-ink-muted">{t.kcalUnit}</span>
        </p>
      </div>
      <Breakdown items={equation} />
      <div className="flex flex-col gap-8 border-t border-border pt-12">
        <h3 id="today-target" className="text-caption font-semibold tracking-wide text-ink-muted uppercase">
          {t.targetHeading}
        </h3>
        <Breakdown role="group" aria-labelledby="today-target" items={targetBreakdown(summary)} />
        {summary.targetKcal < summary.bmrKcal ? (
          <p className="rounded-inputs bg-over-wash px-12 py-8 text-body text-over-ink">
            {t.belowBmrWarning(formatKcal(summary.bmrKcal))}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function MacrosCard({ summary }: { summary: ReadySummary }) {
  return (
    <Card aria-labelledby="today-macros" className="flex flex-col gap-12">
      <h2 id="today-macros" className="text-body font-semibold text-ink">
        {t.macrosHeading}
      </h2>
      <ul className="flex flex-col gap-12">
        {MACROS.map((macro) => {
          const consumed = summary.consumed[macro.key];
          const target = summary.macroTargets[macro.key];
          return (
            <li key={macro.key} className="flex flex-col gap-4">
              <div className="flex justify-between text-body">
                <span className="text-ink">{macro.label}</span>
                <span className="tabular text-ink-muted">
                  {t.macroAmount(formatAmount(consumed), formatKcal(target))}
                </span>
              </div>
              <div aria-hidden="true" className="h-8 w-full overflow-hidden rounded-full bg-surface-alt">
                <div className={`h-full rounded-full ${macro.barClass}`} style={{ width: barWidth(consumed, target) }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

type TodayViewProps = {
  /** Today's date, already formatted ("Thursday, October 15"). */
  dateLabel: string;
  summary: TodaySummary;
};

/**
 * Today dashboard: remaining kcal (target + exercise - food), how the target
 * follows from TDEE, the weight goal and the safe minimum (with a warning when
 * it is below BMR), and macros; or, when the target cannot be computed, a
 * prompt to finish the profile or to fix an under-age birth date.
 */
export function TodayView({ dateLabel, summary }: TodayViewProps) {
  return (
    <div className="flex flex-col gap-24">
      <PageHeader
        title={t.title}
        description={dateLabel}
        actions={
          <ButtonLink href="/diary" variant="primary">
            <Plus aria-hidden="true" size={18} />
            <span>{t.logFood}</span>
          </ButtonLink>
        }
      />

      {summary.status === "ready" ? (
        <>
          <BalanceCard summary={summary} />
          <MacrosCard summary={summary} />
        </>
      ) : summary.status === "underage" ? (
        <EmptyState
          message={t.underageMessage(summary.minAgeYears)}
          action={<ButtonLink href="/settings">{t.underageAction}</ButtonLink>}
        />
      ) : (
        <EmptyState
          message={t.setupMessage}
          action={
            <>
              <p className="text-body text-ink-muted">
                {t.missing(summary.missing.map((field) => t.missingFields[field]))}
              </p>
              <ButtonLink href="/settings">{t.setupAction}</ButtonLink>
            </>
          }
        />
      )}
    </div>
  );
}
