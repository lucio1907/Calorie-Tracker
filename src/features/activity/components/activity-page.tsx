import { DayTransition } from "@/components/ui";
import { requireUser } from "@/features/auth/data/current-user";
import { resolveDiaryDate } from "@/features/diary/lib/diary-date";
import { getLatestWeight } from "@/features/settings/data/settings";
import { appToday } from "@/lib/app-time";
import { requestNow } from "@/lib/request-time";
import { ActivityScreenContainer } from "../containers/activity-screen-container";
import { getActivityCatalog, getActivityEntries } from "../data/activity";
import { buildActivityDay } from "../lib/activity-day";

type ActivityPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * Activity route content for ?date=YYYY-MM-DD (today in the app time zone
 * when missing or invalid). Reads per request: must render inside <Suspense>.
 */
export async function ActivityPage({ searchParams }: ActivityPageProps) {
  const [{ date: dateParam }, now, user] = await Promise.all([searchParams, requestNow(), requireUser()]);
  const today = appToday(now);
  const date = resolveDiaryDate(dateParam, today);

  const [entries, catalog, weight] = await Promise.all([
    getActivityEntries(user.id, date),
    getActivityCatalog(),
    getLatestWeight(user.id, date),
  ]);

  return (
    // A new day remounts the screen (closed sheet) and slides it in from the side it comes from.
    <DayTransition key={date}>
      <ActivityScreenContainer
        date={date}
        today={today}
        day={buildActivityDay(entries)}
        catalog={catalog}
        weight={weight}
      />
    </DayTransition>
  );
}
