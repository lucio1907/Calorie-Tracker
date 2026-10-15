/** food_entries.label check constraint: 1-200 characters. */
export const MAX_LABEL_LENGTH = 200;

/**
 * Label stored on an entry at log time ("Name (Brand)"), so the diary still
 * reads correctly after the food is renamed or deleted.
 */
export function entryLabel(food: { name: string; brand: string | null }): string {
  const withBrand = food.brand ? `${food.name} (${food.brand})` : food.name;
  if (withBrand.length <= MAX_LABEL_LENGTH) return withBrand;
  return food.name.slice(0, MAX_LABEL_LENGTH);
}
