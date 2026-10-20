import type { CalendarDate } from "@/domain";
import type { TodayProfile } from "@/features/today/lib/today-summary";

/** The profile as it was from `effectiveDate` until the next version (public.profile_versions). */
export type ProfileVersion = { effectiveDate: CalendarDate; profile: TodayProfile };

/**
 * The profile that applied on `date`: the latest version effective on or
 * before it. Days before the first version use the earliest one (the closest
 * thing to what the user had then). Null when there is no version at all.
 * `versions` must be sorted oldest first.
 */
export function profileOnDate(versions: readonly ProfileVersion[], date: CalendarDate): TodayProfile | null {
  let applied: ProfileVersion | null = null;
  for (const version of versions) {
    if (version.effectiveDate > date) break;
    applied = version;
  }
  return (applied ?? versions[0] ?? null)?.profile ?? null;
}
