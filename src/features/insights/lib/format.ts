import type { CalendarDate } from "@/domain";

const longDate = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });

/** "19 de octubre de 2026": formatted in UTC from UTC midnight, so the calendar day never shifts. */
export function formatInsightDate(date: CalendarDate): string {
  return longDate.format(new Date(`${date}T00:00:00Z`));
}
