import { calendarDateInZone, minutesOfDayInZone, suggestMeal, type CalendarDate, type Meal } from "@/domain";

/**
 * The one time zone the app reasons in. Diary dates are the user's local
 * calendar day, so "today" is always computed here, never from the UTC date
 * (at 22:00 in Buenos Aires it is already tomorrow in UTC).
 */
export const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";

/** The local calendar day of `instant`. */
export function appToday(instant: Date): CalendarDate {
  return calendarDateInZone(instant, APP_TIME_ZONE);
}

/** Meal to preselect when logging at `instant` (local time of day). */
export function suggestMealAt(instant: Date): Meal {
  return suggestMeal(minutesOfDayInZone(instant, APP_TIME_ZONE));
}
