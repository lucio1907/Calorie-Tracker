/** Biological sex used by the BMR formula. Values match the database. */
export const Sex = {
  Male: "male",
  Female: "female",
} as const;

export type Sex = (typeof Sex)[keyof typeof Sex];

export const SEXES: readonly Sex[] = Object.values(Sex);
