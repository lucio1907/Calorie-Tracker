import type { ActivityLevel, Goal, Sex } from "@/domain";

/** User-facing copy for the settings feature. Translate here. */
export const settingsStrings = {
  title: "Settings",
  description: "Body data, goal and macro split.",
  accountHeading: "Account",

  profile: {
    heading: "Profile",
    description: "Used to estimate your daily calorie target.",
    bodyLegend: "Body",
    sex: "Sex",
    sexHint: "Used by the BMR formula.",
    sexPlaceholder: "Choose…",
    birthDate: "Birth date",
    heightCm: "Height (cm)",
    activityLevel: "Activity level",
    activityPlaceholder: "Choose…",
    goalLegend: "Goal",
    goal: "Weight goal",
    goalKgPerWeek: "Rate (kg per week)",
    rateHint: (min: number, max: number) => `Between ${min} and ${max} kg.`,
    rateEffect: (kcal: string, direction: "below" | "above") => `≈ ${kcal} kcal/day ${direction} TDEE.`,
    macrosLegend: "Macro split",
    macrosHint: "Percent of the daily target. Must add up to 100%.",
    proteinPct: "Protein (%)",
    carbsPct: "Carbs (%)",
    fatPct: "Fat (%)",
    macroTotal: (total: string) => `Total: ${total}%`,
    save: "Save profile",
    saving: "Saving…",
    saved: "Profile saved. Today now uses these values.",
  },

  sexes: { male: "Male", female: "Female" } satisfies Record<Sex, string>,
  activityLevels: {
    sedentary: "Sedentary (little or no exercise)",
    light: "Light (1–3 days a week)",
    moderate: "Moderate (3–5 days a week)",
    active: "Active (6–7 days a week)",
    very_active: "Very active (hard daily exercise or physical job)",
  } satisfies Record<ActivityLevel, string>,
  goals: {
    lose: "Lose weight",
    maintain: "Maintain weight",
    gain: "Gain weight",
  } satisfies Record<Goal, string>,

  weight: {
    heading: "Weight",
    latest: (kg: string, when: string) => `Latest: ${kg} kg (${when})`,
    today: "today",
    none: "No weight logged yet.",
    kg: "Current weight (kg)",
    hint: "Saved for today. Logging again today replaces today's value.",
    save: "Log weight",
    saving: "Saving…",
    saved: "Weight saved.",
  },

  validation: {
    required: "Required.",
    number: "Enter a number.",
    wholeNumber: "Enter a whole number.",
    date: "Enter a valid date.",
    birthDateRange: "Enter a birth date after 1900 and at least a year ago.",
    heightRange: (min: number, max: number) => `Enter a height between ${min} and ${max} cm.`,
    rateRange: (min: number, max: number) => `Enter between ${min} and ${max} kg per week.`,
    pctRange: "Enter a value from 0 to 100.",
    macroTotal: (total: number) => `Protein, carbs and fat must add up to 100% (now ${total}%).`,
    weightRange: (min: number, max: number) => `Enter a weight between ${min} and ${max} kg.`,
    fix: "Check the highlighted fields.",
  },

  errors: {
    unauthorized: "Your session expired. Sign in again.",
    profileSaveFailed: "Could not save your profile. Try again.",
    weightSaveFailed: "Could not save your weight. Try again.",
  },
} as const;
