import { ZERO_NUTRIENTS, type CalendarDate } from "@/domain";
import { toDecimal } from "@/features/foods/lib/food-schema";
import { buildTodaySummary, type Macros } from "@/features/today/lib/today-summary";
import { parseProfileForm } from "./profile-schema";
import type { ProfileFormValues } from "./types";

/** What the macro settings in the form would give today. */
export type MacroPreview =
  /** No weight logged: grams cannot be computed. */
  | { status: "noWeight" }
  /** The protein setting is not valid yet. */
  | { status: "invalid" }
  /** Only protein: the rest of the profile cannot give a calorie target yet. */
  | { status: "protein"; weightKg: number; protein: number }
  | { status: "full"; weightKg: number; targetKcal: number; grams: Macros; proteinCapped: boolean };

function toFormData(values: ProfileFormValues): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(values)) data.set(name, value);
  return data;
}

/**
 * Macro targets for the form as typed, with the latest weight and `today`,
 * the same way Today computes them (validated with the form's own rules).
 */
export function macroPreview(values: ProfileFormValues, weightKg: number | null, today: CalendarDate): MacroPreview {
  if (weightKg === null || !(weightKg > 0)) return { status: "noWeight" };

  const parsed = parseProfileForm(toFormData(values), today);
  if (parsed.ok) {
    const summary = buildTodaySummary({
      today,
      profile: parsed.value,
      weightKg,
      food: ZERO_NUTRIENTS,
      exerciseKcal: [],
    });
    if (summary.status === "ready") {
      return {
        status: "full",
        weightKg,
        targetKcal: summary.targetKcal,
        grams: summary.macroTargets,
        proteinCapped: summary.proteinCapped,
      };
    }
  }
  // The form's protein rule accepted the text, so it parses to a number in range.
  const proteinGPerKg = parsed.ok ? parsed.value.proteinGPerKg : toDecimal(values.proteinGPerKg);
  if ((!parsed.ok && parsed.fieldErrors.proteinGPerKg) || typeof proteinGPerKg !== "number") return { status: "invalid" };
  return { status: "protein", weightKg, protein: Math.round(weightKg * proteinGPerKg) };
}
