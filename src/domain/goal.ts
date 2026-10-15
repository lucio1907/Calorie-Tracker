/** Weight goal direction. Values match the database. */
export const Goal = {
  Lose: "lose",
  Maintain: "maintain",
  Gain: "gain",
} as const;

export type Goal = (typeof Goal)[keyof typeof Goal];

export const GOALS: readonly Goal[] = Object.values(Goal);

const SIGNS: Record<Goal, -1 | 0 | 1> = {
  lose: -1,
  maintain: 0,
  gain: 1,
};

/** Sign applied to the weekly weight change rate. */
export function goalSign(goal: Goal): -1 | 0 | 1 {
  return SIGNS[goal];
}
