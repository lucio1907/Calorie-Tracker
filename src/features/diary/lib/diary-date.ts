import { z } from "zod";
import { addDays, isCalendarDate, type CalendarDate } from "@/domain";

/**
 * Diary dates outside this range are treated as typos (and keep date math
 * away from years JavaScript cannot print as YYYY-MM-DD).
 */
export const MIN_DIARY_DATE: CalendarDate = "2000-01-01";
export const MAX_DIARY_DATE: CalendarDate = "2100-12-31";

/** A real calendar date in YYYY-MM-DD form inside the supported range. */
export function isDiaryDate(value: unknown): value is CalendarDate {
  return typeof value === "string" && isCalendarDate(value) && value >= MIN_DIARY_DATE && value <= MAX_DIARY_DATE;
}

export const diaryDateSchema = z.custom<CalendarDate>(isDiaryDate);

/** The ?date= search param, or today when it is missing or invalid. */
export function resolveDiaryDate(param: string | string[] | undefined, today: CalendarDate): CalendarDate {
  return isDiaryDate(param) ? param : today;
}

export type RelativeDay = "today" | "yesterday" | "tomorrow";

/** "today" / "yesterday" / "tomorrow" relative to `today`, otherwise null. */
export function relativeDay(date: CalendarDate, today: CalendarDate): RelativeDay | null {
  if (date === today) return "today";
  if (date === addDays(today, -1)) return "yesterday";
  if (date === addDays(today, 1)) return "tomorrow";
  return null;
}

const withYear = new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const withoutYear = new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
});

/**
 * "miércoles, 14 de octubre" (plus the year when it is not today's year), lowercase as
 * Spanish writes it mid-sentence; standalone labels capitalize it with CSS.
 * Formatted in UTC from UTC midnight, so the calendar day never shifts.
 */
export function formatDiaryDate(date: CalendarDate, today: CalendarDate): string {
  const instant = new Date(`${date}T00:00:00Z`);
  return (date.slice(0, 4) === today.slice(0, 4) ? withoutYear : withYear).format(instant);
}
