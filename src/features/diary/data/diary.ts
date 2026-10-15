import "server-only";
import { isMeal, type CalendarDate, type Meal } from "@/domain";
import { createClient } from "@/lib/supabase/server";
import type { DiaryEntry } from "../lib/types";

/*
 * Server-only reads for the diary. Queries run with the caller's session
 * (publishable key), so RLS limits rows to the caller's own entries; the
 * user_id filter is there for the (user_id, entry_date) index.
 */

const ENTRY_COLUMNS = "id, meal, food_id, recipe_id, label, grams, quantity, portion_label, kcal, protein, carbs, fat";

function toMeal(value: string): Meal {
  if (!isMeal(value)) throw new Error(`Unknown meal: ${value}`);
  return value;
}

/** One day's entries in the order they were logged. */
export async function getDiaryEntries(userId: string, date: CalendarDate): Promise<DiaryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("food_entries")
    .select(ENTRY_COLUMNS)
    .eq("user_id", userId)
    .eq("entry_date", date)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(`diary ${date}: ${error.message}`);

  return data.map((row) => ({
    id: row.id,
    meal: toMeal(row.meal),
    foodId: row.food_id,
    recipeId: row.recipe_id,
    label: row.label,
    grams: Number(row.grams),
    quantity: row.quantity === null ? null : Number(row.quantity),
    portionLabel: row.portion_label,
    kcal: Number(row.kcal),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
  }));
}
