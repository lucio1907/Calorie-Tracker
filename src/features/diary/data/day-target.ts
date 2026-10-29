import "server-only";
import type { CalendarDate } from "@/domain";
import { getProfileVersions } from "@/features/progress/data/progress";
import { profileOnDate } from "@/features/progress/lib/profile-history";
import { getLatestWeight } from "@/features/settings/data/settings";
import { getExerciseKcal, getTodayProfile } from "@/features/today/data/today";
import type { TodaySummaryInput } from "@/features/today/lib/today-summary";

export type DayTargetInputs = Pick<TodaySummaryInput, "profile" | "weightKg" | "exerciseKcal">;

/**
 * The profile that applied on `date` (its version history), or the current
 * one when no version exists yet, so past days keep the target they had.
 */
async function getProfileOn(userId: string, date: CalendarDate) {
  const versions = await getProfileVersions(userId, date, date);
  return profileOnDate(versions, date) ?? getTodayProfile(userId);
}

/**
 * What the day's target needs besides the food: that day's profile, the
 * latest weight on or before it and its exercise. Null (logged) when a read
 * fails: the target is extra on the Diary, so it never takes the day down.
 */
export async function getDayTargetInputs(userId: string, date: CalendarDate): Promise<DayTargetInputs | null> {
  try {
    const [profile, weight, exerciseKcal] = await Promise.all([
      getProfileOn(userId, date),
      getLatestWeight(userId, date),
      getExerciseKcal(userId, date),
    ]);
    return { profile, weightKg: weight?.kg ?? null, exerciseKcal };
  } catch (error) {
    console.error("[diary] day target reads failed", error);
    return null;
  }
}
