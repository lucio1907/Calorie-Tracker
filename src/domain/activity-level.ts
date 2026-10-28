/** Physical activity level. Values match the database. */
export const ActivityLevel = {
  Sedentary: "sedentary",
  Light: "light",
  Moderate: "moderate",
  Active: "active",
  VeryActive: "very_active",
} as const;

export type ActivityLevel = (typeof ActivityLevel)[keyof typeof ActivityLevel];

export const ACTIVITY_LEVELS: readonly ActivityLevel[] = Object.values(ActivityLevel);

const MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Multiplier applied to BMR to estimate total daily energy expenditure. */
export function activityMultiplier(level: ActivityLevel): number {
  return MULTIPLIERS[level];
}
