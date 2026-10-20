import { assertNonNegative, assertPositive, InvalidArgumentError } from "./assert";

/** Energy per gram of each macro (Atwater factors). */
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

/**
 * Protein target per kg of body weight: the allowed range (the CHECK on
 * public.profiles.protein_g_per_kg), its step and the default. 0.8 g/kg is
 * the adult RDA; 1.6-2.2 g/kg is the usual range for keeping muscle in a
 * deficit; beyond 3 g/kg brings no known benefit.
 */
export const PROTEIN_G_PER_KG = { min: 0.8, max: 3, step: 0.1, default: 1.8 } as const;

/** How the kcal left after protein are split between carbs and fat, in percent (sums to 100). */
export type CarbFatSplit = { carbs: number; fat: number };

/**
 * Default carbs/fat split of the kcal left after protein. With protein at
 * 20-30% of the target it puts fat at about 28-32% of the target (inside the
 * 20-35% adult reference range) and gives carbs the larger share, about
 * 42-48%, as a typical mixed diet does.
 */
export const DEFAULT_CARB_FAT_SPLIT: Readonly<CarbFatSplit> = { carbs: 60, fat: 40 };

export type MacroGrams = { protein: number; carbs: number; fat: number };

export type MacroTargetsInput = {
  /** Daily calorie target in kcal. */
  targetKcal: number;
  /** Latest body weight in kg. */
  weightKg: number;
  proteinGPerKg: number;
  split: CarbFatSplit;
};

export type MacroTargets = {
  /** Whole grams per macro. */
  grams: MacroGrams;
  /**
   * True when the protein setting alone reaches the calorie target: protein
   * is capped to the target (targetKcal / 4 g) and carbs and fat are 0.
   */
  proteinCapped: boolean;
};

/**
 * Daily macro targets: protein from body weight (round(weightKg x g/kg)),
 * then the kcal left (target - protein kcal) split between carbs and fat.
 * Carbs and fat use the rounded protein grams, so the three add back up to
 * the target within rounding.
 */
export function macroTargets({ targetKcal, weightKg, proteinGPerKg, split }: MacroTargetsInput): MacroTargets {
  assertPositive(targetKcal, "targetKcal");
  assertPositive(weightKg, "weightKg");
  assertPositive(proteinGPerKg, "proteinGPerKg");
  assertNonNegative(split.carbs, "split.carbs");
  assertNonNegative(split.fat, "split.fat");
  const splitTotal = split.carbs + split.fat;
  if (splitTotal <= 0) throw new InvalidArgumentError("split must give carbs or fat a share, got 0.");

  const protein = Math.round(weightKg * proteinGPerKg);
  const leftKcal = targetKcal - protein * KCAL_PER_GRAM.protein;
  if (leftKcal <= 0) {
    return {
      grams: { protein: Math.floor(targetKcal / KCAL_PER_GRAM.protein), carbs: 0, fat: 0 },
      proteinCapped: true,
    };
  }

  return {
    grams: {
      protein,
      carbs: Math.round((leftKcal * split.carbs) / splitTotal / KCAL_PER_GRAM.carbs),
      fat: Math.round((leftKcal * split.fat) / splitTotal / KCAL_PER_GRAM.fat),
    },
    proteinCapped: false,
  };
}
