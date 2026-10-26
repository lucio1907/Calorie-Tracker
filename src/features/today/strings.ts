import type { MissingProfileField } from "./lib/today-summary";

/** User-facing copy for the today feature. Translate here. */
export const todayStrings = {
  title: "Today",
  logFood: "Log food",
  remainingLabel: "Left to eat today",
  overLabel: "Over today's target",
  kcalUnit: "kcal",
  targetHeading: "Daily target",
  targetBreakdown: {
    tdee: "TDEE",
    lose: (kgPerWeek: string) => `− Lose ${kgPerWeek} kg/week`,
    gain: (kgPerWeek: string) => `+ Gain ${kgPerWeek} kg/week`,
    floor: (minimum: string) => `+ Raised to safe minimum (${minimum} kcal)`,
    target: "= Target",
  },
  belowBmrWarning: (bmr: string) =>
    `Your target is below your BMR (${bmr} kcal). Eating this little for long is hard to sustain; consider a slower rate.`,
  equation: {
    target: "Target",
    food: "Food",
    exercise: "Exercise",
    /** Food comes off the budget, exercise adds to it. */
    foodValue: (kcal: string) => `−${kcal}`,
    exerciseValue: (kcal: string) => `+${kcal}`,
  },
  macrosHeading: "Macros",
  macros: {
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
  },
  /** Follows the consumed grams: "90.3 / 207 g". */
  macroTarget: (target: string) => ` / ${target} g`,
  proteinCappedWarning: (gPerKg: string) =>
    `Your protein setting (${gPerKg} g/kg) needs more calories than your daily target, so protein is capped at the target and carbs and fat are 0. Lower it in Settings.`,
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
  underageMessage: (minAgeYears: number) =>
    `You must be ${minAgeYears} or older to get a calorie target. Update your birth date in Settings.`,
  underageAction: "Update birth date",
} as const;
