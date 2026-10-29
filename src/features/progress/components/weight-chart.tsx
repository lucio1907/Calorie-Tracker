"use client";

import { useState, type PointerEvent } from "react";
import { Card } from "@/components/ui";
import type { CalendarDate } from "@/domain";
import { formatKg, formatShortDate, formatSignedKg } from "../lib/format";
import { linePath, weightScale, xPercent, yPercent, type WeightTrend } from "../lib/weight-trend";
import { progressStrings } from "../strings";

const t = progressStrings.weight;

type WeightChartProps = {
  trend: WeightTrend;
  from: CalendarDate;
  to: CalendarDate;
  rangeDays: number;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="text-caption font-semibold tracking-wide text-ink-muted uppercase">{label}</dt>
      <dd className="tabular text-body-lg text-ink">{value}</dd>
    </div>
  );
}

/**
 * Weight trend card: headline stats, then a line chart of every entry in the
 * range (Electric Blue, with dots) and its trailing 7-day average (darker
 * line). Lines are drawn in a stretched 0-100 SVG (non-scaling strokes);
 * dots, labels and the hover tooltip are HTML positioned in percent, so they
 * never distort. The weight log below the chart is its table view.
 */
export function WeightChart({ trend, from, to, rangeDays }: WeightChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const { points } = trend;
  const scale = weightScale(points);
  const coordinates = points.map((point) => ({
    x: xPercent(point.date, from, to),
    y: yPercent(point.kg, scale),
    averageY: yPercent(point.averageKg, scale),
  }));
  const weightPath = linePath(coordinates);
  const averagePath = linePath(coordinates.map(({ x, averageY }) => ({ x, y: averageY })));
  const hovered = active === null ? null : { point: points[active], at: coordinates[active] };

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (coordinates.length === 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100;
    let nearest = 0;
    coordinates.forEach((point, index) => {
      if (Math.abs(point.x - x) < Math.abs(coordinates[nearest].x - x)) nearest = index;
    });
    setActive(nearest);
  }

  return (
    <Card aria-labelledby="progress-weight" className="flex flex-col gap-16">
      <h2 id="progress-weight" className="text-body font-semibold text-ink">
        {t.heading}
      </h2>

      {points.length === 0 ? (
        <p className="text-body text-ink-muted">{t.empty}</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-12 sm:grid-cols-4">
            <Stat label={t.latest} value={trend.latest ? t.kg(formatKg(trend.latest.kg)) : t.noChange} />
            <Stat
              label={t.change}
              value={trend.changeKg === null ? t.noChange : t.signedKg(formatSignedKg(trend.changeKg))}
            />
            <Stat label={t.lowest} value={trend.minKg === null ? t.noChange : t.kg(formatKg(trend.minKg))} />
            <Stat label={t.highest} value={trend.maxKg === null ? t.noChange : t.kg(formatKg(trend.maxKg))} />
          </dl>

          <figure className="flex flex-col gap-8">
            <div className="flex gap-8">
              {/* Y axis labels, top (max) to bottom (min). */}
              <div aria-hidden="true" className="relative h-200 w-40 shrink-0">
                {scale.ticks.map((tick) => (
                  <span
                    key={tick}
                    className="tabular absolute right-0 -translate-y-1/2 text-caption text-ink-subtle"
                    style={{ top: `${yPercent(tick, scale)}%` }}
                  >
                    {formatKg(tick)}
                  </span>
                ))}
              </div>

              <div
                role="img"
                aria-label={t.chartLabel(points.length, rangeDays, formatShortDate(from), formatShortDate(to))}
                data-testid="weight-chart"
                className="relative h-200 min-w-0 flex-1 touch-pan-y"
                onPointerMove={onPointerMove}
                onPointerLeave={() => setActive(null)}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 size-full overflow-visible"
                >
                  {scale.ticks.map((tick) => (
                    <line
                      key={tick}
                      x1={0}
                      x2={100}
                      y1={yPercent(tick, scale)}
                      y2={yPercent(tick, scale)}
                      className="stroke-border"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {hovered ? (
                    <line
                      x1={hovered.at.x}
                      x2={hovered.at.x}
                      y1={0}
                      y2={100}
                      className="stroke-border-strong"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  <path
                    d={weightPath}
                    fill="none"
                    className="stroke-consumed"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={averagePath}
                    fill="none"
                    className="stroke-deep-sapphire"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                {coordinates.map((point, index) => (
                  <span
                    key={points[index].date}
                    aria-hidden="true"
                    className={`absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-consumed ring-2 ring-surface transition-transform duration-150 ${active === index ? "scale-150" : ""}`}
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  />
                ))}

                {hovered ? (
                  <div
                    aria-hidden="true"
                    // Shifted back by the point's own share of its width, so it stays inside the plot
                    // (and the page) at any x, on narrow screens too.
                    className="pointer-events-none absolute top-0 z-10 w-max max-w-[min(200px,100%)] rounded-inputs border border-border bg-surface px-8 py-4 text-caption text-ink shadow-sm"
                    style={{ left: `${hovered.at.x}%`, transform: `translateX(-${hovered.at.x}%)` }}
                  >
                    {t.tooltip(
                      formatShortDate(hovered.point.date),
                      formatKg(hovered.point.kg),
                      formatKg(hovered.point.averageKg),
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div aria-hidden="true" className="flex justify-between pl-48 text-caption text-ink-subtle">
              <span>{formatShortDate(from)}</span>
              <span>{formatShortDate(to)}</span>
            </div>

            <figcaption className="flex flex-wrap gap-16 text-caption text-ink-muted">
              <span className="inline-flex items-center gap-8">
                <span aria-hidden="true" className="inline-block h-2 w-16 rounded-full bg-consumed" />
                {t.legendWeight}
              </span>
              <span className="inline-flex items-center gap-8">
                <span aria-hidden="true" className="inline-block h-4 w-16 rounded-full bg-deep-sapphire" />
                {t.legendAverage}
              </span>
            </figcaption>
          </figure>
        </>
      )}
    </Card>
  );
}
