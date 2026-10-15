import "server-only";
import type { CalendarDate } from "@/domain";
import { createClient } from "@/lib/supabase/server";
import type { TodayProfile } from "../lib/today-summary";

/*
 * Server-only reads for the Today screen. Queries run with the caller's
 * session (publishable key), so RLS limits rows to the caller's own data;
 * the user_id filters match the (user_id, entry_date) indexes.
 */

/** The caller's profile, or null before one exists. */
export async function getTodayProfile(userId: string): Promise<TodayProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("sex, birth_date, height_cm, activity_level, goal, goal_kg_per_week, protein_pct, carbs_pct, fat_pct")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`profile: ${error.message}`);
  if (!data) return null;

  return {
    sex: data.sex,
    birthDate: data.birth_date,
    heightCm: data.height_cm === null ? null : Number(data.height_cm),
    activityLevel: data.activity_level,
    goal: data.goal,
    goalKgPerWeek: Number(data.goal_kg_per_week),
    macroSplit: { protein: data.protein_pct, carbs: data.carbs_pct, fat: data.fat_pct },
  };
}

/** Most recent logged weight on or before `date`, or null when none. */
export async function getLatestWeightKg(userId: string, date: CalendarDate): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weight_entries")
    .select("kg")
    .eq("user_id", userId)
    .lte("entry_date", date)
    .order("entry_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`weight ${date}: ${error.message}`);

  return data ? Number(data.kg) : null;
}

/** kcal snapshot of each exercise logged on `date`. */
export async function getExerciseKcal(userId: string, date: CalendarDate): Promise<number[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_entries")
    .select("kcal")
    .eq("user_id", userId)
    .eq("entry_date", date);
  if (error) throw new Error(`exercise ${date}: ${error.message}`);

  return data.map((row) => Number(row.kcal));
}
