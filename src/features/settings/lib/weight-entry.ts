import type { CalendarDate } from "@/domain";
import { formatDiaryDate } from "@/features/diary/lib/diary-date";
import { toDecimal } from "@/features/foods/lib/food-schema";
import { appToday } from "@/lib/app-time";
import { settingsStrings } from "../strings";
import type { LatestWeight } from "./types";

const v = settingsStrings.validation;

/** Mirrors the CHECK on public.weight_entries.kg (numeric(5, 2), 20-400). */
export const WEIGHT_LIMITS = { min: 20, max: 400 } as const;

export type ParseWeightResult = { ok: true; value: number } | { ok: false; error: string };

/** Reads the weight form's `kg` field: a decimal comma is fine, stored with 2 decimals. */
export function parseWeightForm(formData: FormData): ParseWeightResult {
  const raw = formData.get("kg");
  const value = toDecimal(typeof raw === "string" ? raw : undefined);
  if (value === undefined) return { ok: false, error: v.required };
  if (typeof value !== "number" || !Number.isFinite(value)) return { ok: false, error: v.number };

  const { min, max } = WEIGHT_LIMITS;
  if (value < min || value > max) return { ok: false, error: v.weightRange(min, max) };
  return { ok: true, value: Math.round(value * 100) / 100 };
}

/**
 * The weight row for "today" at `now`: the app-time-zone calendar day, never
 * the UTC day. Stored with an upsert on (user_id, entry_date), so logging
 * again on the same day replaces that day's value.
 */
export function todayWeightEntry(kg: number, now: Date): { entry_date: CalendarDate; kg: number } {
  return { entry_date: appToday(now), kg };
}

const kgFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2, useGrouping: false });

/** "Latest: 80.5 kg (today)", or the date it was logged ("Wednesday, October 14"). */
export function latestWeightText(latest: LatestWeight | null, today: CalendarDate): string {
  const w = settingsStrings.weight;
  if (latest === null) return w.none;
  const when = latest.date === today ? w.today : formatDiaryDate(latest.date, today);
  return w.latest(kgFormat.format(latest.kg), when);
}
