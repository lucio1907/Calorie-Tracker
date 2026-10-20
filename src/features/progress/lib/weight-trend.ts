import { addDays, type CalendarDate } from "@/domain";
import { daysBetween } from "./progress-range";
import type { WeightEntry } from "./types";

/** Days in the trailing moving average (the day itself and the 6 before it). */
export const MOVING_AVERAGE_DAYS = 7;

/** One charted weight with its trailing 7-day average. */
export type WeightPoint = { date: CalendarDate; kg: number; averageKg: number };

export type WeightTrend = {
  /** Entries inside the range, oldest first. */
  points: WeightPoint[];
  latest: WeightPoint | null;
  /** Last minus first weight in the range; null with fewer than two entries. */
  changeKg: number | null;
  minKg: number | null;
  maxKg: number | null;
};

/** Hundredths of a kg (the column scale), so sums and differences never drift. */
function round2(value: number): number {
  return Math.round(value * 100) / 100 || 0;
}

function byDate(a: WeightEntry, b: WeightEntry): number {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

/**
 * Mean of the entries logged in the 7 calendar days ending on `date`. Days
 * without an entry are skipped (not treated as zero), so sparse logging still
 * gives a sensible line.
 */
export function movingAverageKg(sorted: readonly WeightEntry[], date: CalendarDate): number {
  const start = addDays(date, -(MOVING_AVERAGE_DAYS - 1));
  const window = sorted.filter((entry) => entry.date >= start && entry.date <= date);
  if (window.length === 0) return Number.NaN;
  return round2(window.reduce((total, entry) => total + entry.kg, 0) / window.length);
}

/**
 * Weight trend for `from`..`to`. `entries` may include earlier days: they feed
 * the moving average of the first days in the range but are not charted.
 */
export function buildWeightTrend(entries: readonly WeightEntry[], from: CalendarDate, to: CalendarDate): WeightTrend {
  const sorted = [...entries].sort(byDate);
  const points = sorted
    .filter((entry) => entry.date >= from && entry.date <= to)
    .map((entry) => ({ date: entry.date, kg: entry.kg, averageKg: movingAverageKg(sorted, entry.date) }));

  if (points.length === 0) return { points, latest: null, changeKg: null, minKg: null, maxKg: null };

  const weights = points.map((point) => point.kg);
  return {
    points,
    latest: points[points.length - 1],
    changeKg: points.length > 1 ? round2(points[points.length - 1].kg - points[0].kg) : null,
    minKg: Math.min(...weights),
    maxKg: Math.max(...weights),
  };
}

/** The most recent entry on or before `date`, or null. `sorted` is oldest first. */
export function weightOnOrBefore(sorted: readonly WeightEntry[], date: CalendarDate): WeightEntry | null {
  let found: WeightEntry | null = null;
  for (const entry of sorted) {
    if (entry.date > date) break;
    found = entry;
  }
  return found;
}

/** Each entry with the change from the entry logged before it (null for the first), newest first. */
export function withChangeFromPrevious(entries: readonly WeightEntry[]): Array<WeightEntry & { changeKg: number | null }> {
  const sorted = [...entries].sort(byDate);
  return sorted
    .map((entry, index) => ({ ...entry, changeKg: index === 0 ? null : round2(entry.kg - sorted[index - 1].kg) }))
    .reverse();
}

// Chart geometry ---------------------------------------------------------------

/** Y axis of the weight chart: a padded domain with round tick values. */
export type WeightScale = { minKg: number; maxKg: number; ticks: number[] };

const TICK_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
/** Smallest visible span, so a flat week does not exaggerate 0.1 kg wiggles. */
const MIN_SPAN_KG = 2;
const TARGET_TICKS = 4;

/** Y domain and ticks covering every weight and average, never narrower than 2 kg. */
export function weightScale(points: readonly WeightPoint[]): WeightScale {
  const values = points.flatMap((point) => [point.kg, point.averageKg]).filter(Number.isFinite);
  if (values.length === 0) return { minKg: 0, maxKg: MIN_SPAN_KG, ticks: [0, 1, 2] };

  let low = Math.min(...values);
  let high = Math.max(...values);
  if (high - low < MIN_SPAN_KG) {
    const middle = (low + high) / 2;
    low = middle - MIN_SPAN_KG / 2;
    high = middle + MIN_SPAN_KG / 2;
  }

  const rough = (high - low) / (TARGET_TICKS - 1);
  const step = TICK_STEPS.find((candidate) => candidate >= rough) ?? TICK_STEPS[TICK_STEPS.length - 1];
  const minKg = round2(Math.floor(low / step) * step);
  const maxKg = round2(Math.ceil(high / step) * step);
  const ticks: number[] = [];
  for (let tick = minKg; tick <= maxKg + step / 2; tick += step) ticks.push(round2(tick));
  return { minKg, maxKg, ticks };
}

/** Horizontal position of `date` in the range, 0 (from) to 100 (to). */
export function xPercent(date: CalendarDate, from: CalendarDate, to: CalendarDate): number {
  const span = daysBetween(from, to);
  return span <= 0 ? 50 : round2((daysBetween(from, date) / span) * 100);
}

/** Vertical position of `kg`, 0 (top, maxKg) to 100 (bottom, minKg). */
export function yPercent(kg: number, scale: WeightScale): number {
  const span = scale.maxKg - scale.minKg;
  return span <= 0 ? 50 : round2(((scale.maxKg - kg) / span) * 100);
}

/** SVG path ("M x y L x y ...") in a 0-100 viewBox; empty for no points. */
export function linePath(coordinates: ReadonlyArray<{ x: number; y: number }>): string {
  return coordinates.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" ");
}
