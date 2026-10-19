import "server-only";
import type { CalendarDate } from "@/domain";
import { TARGET_PROFILE_COLUMNS, toTodayProfile } from "@/features/today/data/today";
import { createClient } from "@/lib/supabase/server";
import type { ProfileVersion } from "../lib/profile-history";
import type { DailyEnergy, WeightEntry } from "../lib/types";

/*
 * Server-only reads for the Progress screen. Queries run with the caller's
 * session (publishable key), so RLS limits rows to the caller's own data;
 * the user_id filters match the (user_id, entry_date) indexes. Ranges stay
 * within 90 days (+ a week for the moving average), far below max_rows.
 */

/** The caller's weights from `from` to `to` (inclusive), oldest first. */
export async function getWeightEntries(userId: string, from: CalendarDate, to: CalendarDate): Promise<WeightEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weight_entries")
    .select("id, entry_date, kg")
    .eq("user_id", userId)
    .gte("entry_date", from)
    .lte("entry_date", to)
    .order("entry_date", { ascending: true });
  if (error) throw new Error(`weights ${from}..${to}: ${error.message}`);

  return data.map((row) => ({ id: row.id, date: row.entry_date, kg: Number(row.kg) }));
}

/** The caller's latest weight strictly before `date`, or null. */
export async function getWeightBefore(userId: string, date: CalendarDate): Promise<WeightEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weight_entries")
    .select("id, entry_date, kg")
    .eq("user_id", userId)
    .lt("entry_date", date)
    .order("entry_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`weight before ${date}: ${error.message}`);

  return data ? { id: data.id, date: data.entry_date, kg: Number(data.kg) } : null;
}

/** Food and exercise kcal per day from `from` to `to`, summed in the database (one row per day with entries). */
export async function getDailyEnergyTotals(from: CalendarDate, to: CalendarDate): Promise<DailyEnergy[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("daily_energy_totals", { start_date: from, end_date: to });
  if (error) throw new Error(`energy totals ${from}..${to}: ${error.message}`);

  return data.map((row) => ({
    date: row.entry_date,
    foodKcal: Number(row.food_kcal),
    exerciseKcal: Number(row.exercise_kcal),
  }));
}

const VERSION_COLUMNS = `effective_date, ${TARGET_PROFILE_COLUMNS}` as const;

/**
 * The profile versions that apply from `from` to `to`, oldest first: the one
 * in effect on `from`, every one that starts inside the range, and the
 * earliest one (the fallback for days before any version). Each query reads
 * at most a range's worth of rows through the (user_id, effective_date) key.
 */
export async function getProfileVersions(userId: string, from: CalendarDate, to: CalendarDate): Promise<ProfileVersion[]> {
  const supabase = await createClient();
  const versions = () => supabase.from("profile_versions").select(VERSION_COLUMNS).eq("user_id", userId);
  const [inEffect, inRange, earliest] = await Promise.all([
    versions().lte("effective_date", from).order("effective_date", { ascending: false }).limit(1).maybeSingle(),
    versions().gt("effective_date", from).lte("effective_date", to).order("effective_date", { ascending: true }),
    versions().order("effective_date", { ascending: true }).limit(1).maybeSingle(),
  ]);
  if (inEffect.error) throw new Error(`profile on ${from}: ${inEffect.error.message}`);
  if (inRange.error) throw new Error(`profiles ${from}..${to}: ${inRange.error.message}`);
  if (earliest.error) throw new Error(`earliest profile: ${earliest.error.message}`);

  const rows = [earliest.data, inEffect.data, ...inRange.data].filter((row) => row !== null);
  const byDate = new Map(rows.map((row) => [row.effective_date, row]));
  return [...byDate.values()]
    .sort((a, b) => (a.effective_date < b.effective_date ? -1 : 1))
    .map((row) => ({ effectiveDate: row.effective_date, profile: toTodayProfile(row) }));
}
