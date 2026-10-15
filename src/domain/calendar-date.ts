/**
 * Calendar dates as ISO "YYYY-MM-DD" strings (the format of Postgres `date`).
 * A calendar date has no time zone; the zone only matters when turning an
 * instant into "which day is it" (calendarDateInZone).
 */
export type CalendarDate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** True for a real calendar date in strict YYYY-MM-DD form (rejects 2026-02-30). */
export function isCalendarDate(value: string): value is CalendarDate {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** `date` moved by `days` (may be negative). Pure calendar math in UTC, so DST never matters. */
export function addDays(date: CalendarDate, days: number): CalendarDate {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

function zonedParts(instant: Date, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

/** The calendar day `instant` falls on in `timeZone` (never the UTC day). */
export function calendarDateInZone(instant: Date, timeZone: string): CalendarDate {
  const { year, month, day } = zonedParts(instant, timeZone);
  return `${year}-${month}-${day}`;
}

/** Minutes since local midnight in `timeZone` (0-1439). */
export function minutesOfDayInZone(instant: Date, timeZone: string): number {
  const { hour, minute } = zonedParts(instant, timeZone);
  return Number(hour) * 60 + Number(minute);
}

/**
 * Age in whole years on `onDate` for someone born on `birthDate`; the year
 * counts from the birthday itself (29 February birthdays count from 1 March
 * in common years). Zero or negative when `birthDate` is not before `onDate`.
 */
export function ageOnDate(birthDate: CalendarDate, onDate: CalendarDate): number {
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const [year, month, day] = onDate.split("-").map(Number);
  const hadBirthday = month > birthMonth || (month === birthMonth && day >= birthDay);
  return year - birthYear - (hadBirthday ? 0 : 1);
}
