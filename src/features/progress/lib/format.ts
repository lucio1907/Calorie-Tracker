import type { CalendarDate } from "@/domain";

const shortDate = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", month: "short", day: "numeric" });
const kgFormat = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 2, useGrouping: false });
const signedKg = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
  useGrouping: false,
  signDisplay: "exceptZero",
});
const signedKcal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0, useGrouping: false, signDisplay: "exceptZero" });

/** "14 oct": formatted in UTC from UTC midnight, so the calendar day never shifts. */
export function formatShortDate(date: CalendarDate): string {
  return shortDate.format(new Date(`${date}T00:00:00Z`));
}

/** "80,5", "79,25", "80,0". */
export function formatKg(kg: number): string {
  return kgFormat.format(kg);
}

/** "+0,5", "−1,2" style signs ("0,0" for no change). */
export function formatSignedKg(kg: number): string {
  return signedKg.format(kg);
}

/** "+250", "-120", "0". */
export function formatSignedKcal(kcal: number): string {
  return signedKcal.format(Math.round(kcal) || 0);
}
