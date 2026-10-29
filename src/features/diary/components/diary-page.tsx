import { DayTransition } from "@/components/ui";
import { requireUser } from "@/features/auth/data/current-user";
import { getRecentFoods, searchFoods } from "@/features/foods/data/foods";
import { getRecipes } from "@/features/recipes/data/recipes";
import { buildTodaySummary } from "@/features/today/lib/today-summary";
import { appToday, suggestMealAt } from "@/lib/app-time";
import { requestNow } from "@/lib/request-time";
import { Meal } from "@/domain";
import { DiaryScreenContainer } from "../containers/diary-screen-container";
import { getDayTargetInputs } from "../data/day-target";
import { getDiaryEntries } from "../data/diary";
import { resolveDiaryDate } from "../lib/diary-date";
import { buildDiaryDay } from "../lib/diary-day";

type DiaryPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * Diary route content for ?date=YYYY-MM-DD (today in the app time zone when
 * missing or invalid). Reads per request: must render inside <Suspense>.
 */
export async function DiaryPage({ searchParams }: DiaryPageProps) {
  const [{ date: dateParam }, now, user] = await Promise.all([searchParams, requestNow(), requireUser()]);
  const today = appToday(now);
  const date = resolveDiaryDate(dateParam, today);

  const [entries, recentFoods, initialFoods, recipes, targetInputs] = await Promise.all([
    getDiaryEntries(user.id, date),
    getRecentFoods(),
    searchFoods({ query: "", filter: "all" }),
    getRecipes(user.id),
    getDayTargetInputs(user.id, date),
  ]);
  const day = buildDiaryDay(entries);
  // The day's balance, as Today computes it, with that day's profile, weight and exercise.
  const target = targetInputs ? buildTodaySummary({ today: date, food: day.totals, ...targetInputs }) : null;

  return (
    // A new day remounts the screen (closed sheet) and slides it in from the side it comes from.
    <DayTransition key={date}>
      <DiaryScreenContainer
        date={date}
        today={today}
        day={day}
        target={target}
        // Time-of-day suggestions only make sense for today; other days start at breakfast.
        suggestedMeal={date === today ? suggestMealAt(now) : Meal.Breakfast}
        recentFoods={recentFoods}
        initialFoods={initialFoods}
        recipes={recipes}
      />
    </DayTransition>
  );
}
