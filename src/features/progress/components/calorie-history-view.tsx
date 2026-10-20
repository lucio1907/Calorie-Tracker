"use client";

import { useState } from "react";
import { ButtonLink, Card, cn, PillBadge } from "@/components/ui";
import { formatKcal } from "@/features/foods/lib/format";
import type { BalanceStatus, CalorieDay, CalorieHistory } from "../lib/calorie-history";
import { formatShortDate, formatSignedKcal } from "../lib/format";
import { progressStrings } from "../strings";

const t = progressStrings.calories;

const STATUS: Record<Exclude<BalanceStatus, "unlogged">, { label: string; bar: string; dot: string }> = {
  under: { label: t.under, bar: "bg-burned", dot: "bg-burned" },
  over: { label: t.over, bar: "bg-over", dot: "bg-over" },
  on: { label: t.onTarget, bar: "bg-ink-subtle", dot: "bg-ink-subtle" },
};

/** Status Badge: a colored dot plus a text label (never color alone). */
export function BalanceBadge({ status }: { status: BalanceStatus }) {
  if (status === "unlogged") return <PillBadge className="text-ink-muted">{t.notLogged}</PillBadge>;
  const { label, dot } = STATUS[status];
  return (
    <PillBadge className="gap-4">
      <span aria-hidden="true" className={cn("size-6 rounded-full", dot)} />
      {label}
    </PillBadge>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="text-caption font-semibold tracking-wide text-ink-muted uppercase">{label}</dt>
      <dd className="tabular text-body-lg text-ink">{value}</dd>
    </div>
  );
}

/** Share of the half-height a balance fills (the largest one fills it). */
function barShare(balance: number, maxAbs: number): number {
  return maxAbs > 0 ? Math.min(1, Math.abs(balance) / maxAbs) : 0;
}

/**
 * Diverging bars around the target line: over target rises (Tangerine), under
 * target drops (Vivid Green), within tolerance is gray. Days without food
 * have no bar. Hovering a column shows that day's balance.
 */
function BalanceBars({ history }: { history: CalorieHistory }) {
  const [active, setActive] = useState<number | null>(null);
  const maxAbs = Math.max(0, ...history.days.map((day) => Math.abs(day.balanceKcal ?? 0)));
  const hovered = active === null ? null : history.days[active];
  const count = history.days.length;

  return (
    <figure className="flex flex-col gap-8">
      <div
        role="img"
        aria-label={t.chartLabel(history.underDays, history.overDays)}
        data-testid="calorie-chart"
        className="relative h-160"
        onPointerLeave={() => setActive(null)}
      >
        {/* Target line (zero balance). */}
        <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-border-strong" />
        <div aria-hidden="true" className={cn("absolute inset-0 flex", count > 45 ? "gap-px" : "gap-2")}>
          {history.days.map((day, index) => {
            const share = day.balanceKcal === null ? 0 : barShare(day.balanceKcal, maxAbs);
            const status = day.status === "unlogged" ? null : STATUS[day.status];
            return (
              <div
                key={day.date}
                className={cn("relative h-full min-w-0 flex-1", active === index ? "bg-surface-alt" : null)}
                onPointerEnter={() => setActive(index)}
              >
                {status && day.balanceKcal !== null ? (
                  <span
                    className={cn(
                      "absolute inset-x-0 mx-auto max-w-12",
                      status.bar,
                      day.balanceKcal > 0 ? "bottom-1/2 rounded-t-[4px]" : "top-1/2 rounded-b-[4px]",
                    )}
                    // At least 2px so an on-target day stays visible.
                    style={{ height: `max(2px, ${share * 50}%)` }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        {hovered && active !== null ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 z-10 w-max -translate-x-1/2 rounded-inputs border border-border bg-surface px-8 py-4 text-caption text-ink shadow-sm"
            style={{ left: `${Math.min(85, Math.max(15, ((active + 0.5) / count) * 100))}%` }}
          >
            {hovered.balanceKcal === null
              ? `${formatShortDate(hovered.date)}: ${t.notLogged}`
              : t.tooltip(formatShortDate(hovered.date), formatSignedKcal(hovered.balanceKcal))}
          </div>
        ) : null}
      </div>
      <div aria-hidden="true" className="flex justify-between text-caption text-ink-subtle">
        <span>{formatShortDate(history.days[0].date)}</span>
        <span>{formatShortDate(history.days[count - 1].date)}</span>
      </div>
      <figcaption className="flex flex-wrap gap-16 text-caption text-ink-muted">
        {(["under", "over"] as const).map((status) => (
          <span key={status} className="inline-flex items-center gap-8">
            <span aria-hidden="true" className={cn("inline-block size-8 rounded-[2px]", STATUS[status].bar)} />
            {STATUS[status].label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

function DayRow({ day }: { day: CalorieDay }) {
  return (
    <li className="flex min-h-56 items-center gap-12 border-t border-border px-16 py-12 first:border-t-0">
      <span className="flex min-w-0 flex-1 flex-col gap-4">
        <span className="text-body-lg text-ink">{formatShortDate(day.date)}</span>
        <span className="tabular text-caption text-ink-muted">
          {day.targetKcal === null
            ? t.dayDetailNoTarget(formatKcal(day.foodKcal), formatKcal(day.exerciseKcal))
            : t.dayDetail(formatKcal(day.foodKcal), formatKcal(day.exerciseKcal), formatKcal(day.targetKcal))}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-4">
        {day.balanceKcal !== null ? (
          <span className="tabular text-body-lg text-ink">{t.balance(formatSignedKcal(day.balanceKcal))}</span>
        ) : null}
        <BalanceBadge status={day.status} />
      </span>
    </li>
  );
}

/** Daily calorie balance card: summary stats, the diverging bar chart and the logged days (its table view). */
export function CalorieHistoryView({ history }: { history: CalorieHistory }) {
  const logged = history.days.filter((day) => day.foodKcal > 0).reverse();

  return (
    <Card aria-labelledby="progress-calories" className="flex flex-col gap-16">
      <div className="flex flex-col gap-4">
        <h2 id="progress-calories" className="text-body font-semibold text-ink">
          {t.heading}
        </h2>
        <p className="text-body text-ink-muted">{t.description}</p>
      </div>

      {!history.hasTarget ? (
        <div role="status" className="flex flex-col items-start gap-12 rounded-largecards bg-surface-muted p-16">
          <p className="text-body text-ink">{t.noTarget}</p>
          <ButtonLink href="/settings">{t.noTargetAction}</ButtonLink>
        </div>
      ) : null}

      {history.loggedDays === 0 ? (
        <p className="text-body text-ink-muted">{t.empty}</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-12 sm:grid-cols-3">
            {history.averageBalanceKcal !== null ? (
              <Stat label={t.averageBalance} value={`${formatSignedKcal(history.averageBalanceKcal)} ${t.kcal}`} />
            ) : null}
            {history.averageNetKcal !== null ? (
              <Stat label={t.averageNet} value={`${formatKcal(history.averageNetKcal)} ${t.kcal}`} />
            ) : null}
            {history.averageTargetKcal !== null ? (
              <Stat label={t.averageTarget} value={`${formatKcal(history.averageTargetKcal)} ${t.kcal}`} />
            ) : null}
            {history.hasTarget ? (
              <>
                <Stat label={t.daysUnder} value={String(history.underDays)} />
                <Stat label={t.daysOver} value={String(history.overDays)} />
              </>
            ) : null}
          </dl>
          <p className="text-caption text-ink-muted">{t.loggedDays(history.loggedDays, history.days.length)}</p>

          {history.hasTarget ? <BalanceBars history={history} /> : null}

          <ul aria-label={t.dayList} className="rounded-cards border border-border">
            {logged.map((day) => (
              <DayRow key={day.date} day={day} />
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
