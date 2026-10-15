import type { MissingProfileField } from "./lib/today-summary";

/** User-facing copy for the today feature. Translate here. */
export const todayStrings = {
  title: "Today",
  logFood: "Log food",
  remainingLabel: "Remaining",
  overLabel: "Over target",
  kcalUnit: "kcal",
  targetHeading: "Daily target",
  targetBreakdown: {
    tdee: "TDEE",
    lose: (kgPerWeek: string) => `− Lose ${kgPerWeek} kg/week`,
    gain: (kgPerWeek: string) => `+ Gain ${kgPerWeek} kg/week`,
    target: "= Target",
  },
  equation: {
    target: "Target",
    exercise: "+ Exercise",
    food: "− Food",
    remaining: "= Remaining",
  },
  macrosHeading: "Macros",
  macros: {
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
  },
  macroAmount: (consumed: string, target: string) => `${consumed} / ${target} g`,
  setupMessage: "Complete your profile to get a daily calorie target.",
  missingFields: {
    sex: "sex",
    birthDate: "birth date",
    height: "height",
    activityLevel: "activity level",
    weight: "weight",
  } satisfies Record<MissingProfileField, string>,
  missing: (fields: readonly string[]) => `Missing: ${fields.join(", ")}.`,
  setupAction: "Set up profile",
} as const;
