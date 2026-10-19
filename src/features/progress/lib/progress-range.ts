import { addDays, type CalendarDate } from "@/domain";

/** Selectable history lengths, in days (today included). */
export const PROGRESS_RANGES = [7, 30, 90] as const;
export type ProgressRange = (typeof PROGRESS_RANGES)[number];
export const DEFAULT_PROGRESS_RANGE: ProgressRange = 30;

const BASE_PATH = "/progress";

/** The ?range= search param, or the default when it is missing or not one of the options. */
export function resolveProgressRange(param: string | string[] | undefined): ProgressRange {
  return PROGRESS_RANGES.find((range) => String(range) === param) ?? DEFAULT_PROGRESS_RANGE;
}

/** First and last day of the range ending today (both inclusive). */
export function rangeBounds(range: ProgressRange, today: CalendarDate): { from: CalendarDate; to: CalendarDate } {
  return { from: addDays(today, -(range - 1)), to: today };
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** Every day from `from` to `to`, inclusive, oldest first. */
export function daysInRange(from: CalendarDate, to: CalendarDate): CalendarDate[] {
  const count = daysBetween(from, to) + 1;
  return Array.from({ length: Math.max(0, count) }, (_, index) => addDays(from, index));
}

/** URL of the Progress screen for a range; the default range is the bare path. */
export function progressHref(range: ProgressRange): string {
  return range === DEFAULT_PROGRESS_RANGE ? BASE_PATH : `${BASE_PATH}?range=${range}`;
}
