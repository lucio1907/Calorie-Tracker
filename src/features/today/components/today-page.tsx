import { requireUser } from "@/features/auth/data/current-user";
import { getDiaryEntries } from "@/features/diary/data/diary";
import { formatDiaryDate } from "@/features/diary/lib/diary-date";
import { buildDiaryDay } from "@/features/diary/lib/diary-day";
import { appToday } from "@/lib/app-time";
import { requestNow } from "@/lib/request-time";
import { getExerciseKcal, getLatestWeightKg, getTodayProfile } from "../data/today";
import { buildTodaySummary } from "../lib/today-summary";
import { TodayView } from "./today-view";

/**
 * Today route content: today's balance in the app time zone, with food
 * totals from the diary. Reads per request: must render inside <Suspense>.
 */
export async function TodayPage() {
  const [now, user] = await Promise.all([requestNow(), requireUser()]);
  const today = appToday(now);

  const [profile, weightKg, foodEntries, exerciseKcal] = await Promise.all([
    getTodayProfile(user.id),
    getLatestWeightKg(user.id, today),
    getDiaryEntries(user.id, today),
    getExerciseKcal(user.id, today),
  ]);

  const summary = buildTodaySummary({
    today,
    profile,
    weightKg,
    food: buildDiaryDay(foodEntries).totals,
    exerciseKcal,
  });

  return <TodayView dateLabel={formatDiaryDate(today, today)} summary={summary} />;
}
