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
    floor: (minimum: string) => `+ Raised to safe minimum (${minimum} kcal)`,
    target: "= Target",
  },
  belowBmrWarning: (bmr: string) =>
    `Your target is below your BMR (${bmr} kcal). Eating this little for long is hard to sustain; consider a slower rate.`,
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
