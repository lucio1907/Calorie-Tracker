import { Plus } from "lucide-react";
import type { ComponentProps } from "react";
import { ButtonLink, Card, cn, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { formatKcal } from "@/features/foods/lib/format";
import type { TodaySummary } from "../lib/today-summary";
import { todayStrings as t } from "../strings";
import { TodayNumber } from "./today-number";

type ReadySummary = Extract<TodaySummary, { status: "ready" }>;

const MACROS = [
  { key: "protein", label: t.macros.protein, barClass: "bg-protein" },
  { key: "carbs", label: t.macros.carbs, barClass: "bg-carbs" },
  { key: "fat", label: t.macros.fat, barClass: "bg-fat" },
] as const;

const rateFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2, useGrouping: false });

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
    // One row per term on phones (label left, kcal right), so long labels never wrap.
    <dl className="tabular flex flex-col gap-4 text-body sm:flex-row sm:flex-wrap sm:items-center sm:gap-12" {...props}>
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-12 sm:justify-start sm:gap-4">
          <dt className="text-ink-muted">{item.label}</dt>
          <dd className="text-ink">{formatKcal(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Share of `target` reached, 0 to 1 (a full bar once reached). */
function share(consumed: number, target: number): number {
  return target > 0 ? Math.min(1, consumed / target) : 0;
}

function BalanceCard({ summary }: { summary: ReadySummary }) {
  const over = summary.remainingKcal < 0;
  // The remaining kcal is the big number above, so the tiles show only its terms.
  const equation = [
    { label: t.equation.target, value: formatKcal(summary.targetKcal), burned: false },
    { label: t.equation.food, value: t.equation.foodValue(formatKcal(summary.consumed.kcal)), burned: false },
    { label: t.equation.exercise, value: t.equation.exerciseValue(formatKcal(summary.exerciseKcal)), burned: true },
  ];

  return (
    <Card aria-labelledby="today-remaining" className="flex flex-col gap-16">
      <div className="flex flex-col gap-4">
        <h2 id="today-remaining" className="text-body font-semibold text-ink-muted">
          {over ? t.overLabel : t.remainingLabel}
        </h2>
        <p className="flex items-baseline gap-8">
          <TodayNumber
            id="today-remaining"
            value={Math.abs(summary.remainingKcal)}
            format="kcal"
            className={`display-text text-display-xl tabular-nums ${over ? "text-danger-ink" : "text-ink"}`}
          />
          <span className="text-body text-ink-muted">{t.kcalUnit}</span>
        </p>
        {/* Food eaten out of today's budget (target + exercise); the numbers below say the same. */}
        <ProgressBar
          value={share(summary.consumed.kcal, summary.targetKcal + summary.exerciseKcal)}
          fillClassName={over ? "bg-over" : "bg-consumed"}
          className="mt-8"
        />
      </div>
      <dl className="grid grid-cols-3 gap-8">
        {equation.map((item) => (
          <div
            key={item.label}
            className={cn("flex min-w-0 flex-col gap-4 rounded-[14px] p-8 min-[375px]:p-12", item.burned ? "bg-burned-wash text-burned-ink" : "bg-canvas")}
          >
            <dt className={cn("text-caption", !item.burned && "text-ink-muted")}>{item.label}</dt>
            <dd className={cn("tabular font-semibold", !item.burned && "text-ink")}>{item.value}</dd>
          </div>
        ))}
      </dl>
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
      <h2 id="today-macros" className="display-text text-subheading text-ink">
        {t.macrosHeading}
      </h2>
      <ul className="flex flex-col gap-12">
        {MACROS.map((macro) => {
          const consumed = summary.consumed[macro.key];
          const target = summary.macroTargets[macro.key];
          return (
            <li key={macro.key} className="flex flex-col gap-4">
              <div className="flex justify-between text-body">
                <span className="flex items-center gap-8 text-ink">
                  <span aria-hidden="true" className={`size-10 rounded-[3px] ${macro.barClass}`} />
                  {macro.label}
                </span>
                <span className="tabular text-ink-muted">
                  <TodayNumber
                    id={`today-macro-${macro.key}`}
                    value={consumed}
                    format="amount"
                    className="font-bold text-ink"
                  />
                  {t.macroTarget(formatKcal(target))}
                </span>
              </div>
              <ProgressBar value={share(consumed, target)} fillClassName={macro.barClass} />
            </li>
          );
        })}
      </ul>
      {summary.proteinCapped ? (
        <p className="rounded-inputs bg-over-wash px-12 py-8 text-body text-over-ink">
          {t.proteinCappedWarning(rateFormat.format(summary.proteinGPerKg))}
        </p>
      ) : null}
    </Card>
  );
}

type TodayViewProps = {
  /** Today's date, already formatted ("jueves, 15 de octubre"). */
  dateLabel: string;
  summary: TodaySummary;
};

/**
 * Today dashboard: remaining kcal (target + exercise - food), how the target
 * follows from TDEE, the weight goal and the safe minimum (with a warning when
 * it is below BMR), and macros (with a warning when the protein setting takes
 * the whole target); or, when the target cannot be computed, a
 * prompt to finish the profile or to fix an under-age birth date.
 */
export function TodayView({ dateLabel, summary }: TodayViewProps) {
  return (
    <div className="stagger flex flex-col gap-24">
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
