import "server-only";
import type { CalendarDate } from "@/domain";
import { TARGET_PROFILE_COLUMNS } from "@/features/today/data/today";
import { createClient } from "@/lib/supabase/server";
import type { LatestWeight, StoredProfile } from "../lib/types";

/*
 * Server-only reads for the settings screen. Queries run with the caller's
 * session (publishable key), so RLS limits rows to the caller's own data.
 */

/** The caller's profile row, or null before one exists. */
export async function getStoredProfile(userId: string): Promise<StoredProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(TARGET_PROFILE_COLUMNS)
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
    proteinGPerKg: Number(data.protein_g_per_kg),
    carbsSharePct: data.carbs_share_pct,
    fatSharePct: data.fat_share_pct,
  };
}

/** The most recent weight on or before `date` (the one Today uses), or null when none. */
export async function getLatestWeight(userId: string, date: CalendarDate): Promise<LatestWeight | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weight_entries")
    .select("kg, entry_date")
    .eq("user_id", userId)
    .lte("entry_date", date)
    .order("entry_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`weight ${date}: ${error.message}`);

  return data ? { kg: Number(data.kg), date: data.entry_date } : null;
}
