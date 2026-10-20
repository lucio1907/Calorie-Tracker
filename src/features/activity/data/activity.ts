import "server-only";
import type { CalendarDate } from "@/domain";
import { createClient } from "@/lib/supabase/server";
import type { ActivityEntry, CatalogActivity } from "../lib/types";

/*
 * Server-only reads for the activity screen and actions. Queries run with the
 * caller's session (publishable key), so RLS limits activities to shared rows
 * plus the caller's own, and entries to the caller's; the user_id filter is
 * there for the (user_id, entry_date) index.
 */

const CATALOG_COLUMNS = "id, name, met, category";

function toCatalogActivity(row: { id: number; name: string; met: number; category: string }): CatalogActivity {
  return { id: row.id, name: row.name, met: Number(row.met), category: row.category };
}

/** Every activity the caller can log, by name. */
export async function getActivityCatalog(): Promise<CatalogActivity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select(CATALOG_COLUMNS)
    .order("name", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(`activities: ${error.message}`);

  return data.map(toCatalogActivity);
}

/** One activity visible to the caller (shared or own), or null when it does not exist for them. */
export async function getActivity(id: number): Promise<CatalogActivity | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("activities").select(CATALOG_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`activity ${id}: ${error.message}`);

  return data ? toCatalogActivity(data) : null;
}

/** One day's entries in the order they were logged. */
export async function getActivityEntries(userId: string, date: CalendarDate): Promise<ActivityEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_entries")
    .select("id, activity_id, label, minutes, kcal")
    .eq("user_id", userId)
    .eq("entry_date", date)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(`activity entries ${date}: ${error.message}`);

  return data.map((row) => ({
    id: row.id,
    activityId: row.activity_id,
    label: row.label,
    minutes: Number(row.minutes),
    kcal: Number(row.kcal),
  }));
}
