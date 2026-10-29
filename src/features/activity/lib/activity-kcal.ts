import { exerciseKcal } from "@/domain";

/** Largest kcal snapshot activity_entries.kcal (numeric(7, 2)) can store. */
export const MAX_ENTRY_KCAL = 99_999.99;

export type ActivityKcalResult = { ok: true; kcal: number } | { ok: false; error: "invalid" | "too_large" };

/**
 * kcal burned by `minutes` of an activity with this MET for someone weighing
 * `weightKg`: (MET - 1) x kg x hours, in whole kcal (the domain exercise
 * calculator). The server stores this as the entry's snapshot; the form uses
 * the same function for its preview.
 */
export function activityKcal(met: number, weightKg: number, minutes: number): ActivityKcalResult {
  if (![met, weightKg, minutes].every((value) => Number.isFinite(value) && value > 0)) {
    return { ok: false, error: "invalid" };
  }
  const kcal = exerciseKcal(met, weightKg, minutes);
  return kcal > MAX_ENTRY_KCAL ? { ok: false, error: "too_large" } : { ok: true, kcal };
}
