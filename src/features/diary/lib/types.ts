import type { Meal, Nutrients } from "@/domain";

/** One logged food with its nutrient snapshot (absolute values for the logged grams). */
export type DiaryEntry = Nutrients & {
  id: number;
  meal: Meal;
  /** Soft link to the food; null once the food is deleted (or for recipes). */
  foodId: number | null;
  recipeId: number | null;
  label: string;
  grams: number;
  /** Portions logged ("2 x 1 slice"); both null when logged in grams. */
  quantity: number | null;
  portionLabel: string | null;
};

/** How much was logged: grams plus, when logged by portion, the portion count and label. */
export type EntryAmount = {
  grams: number;
  quantity: number | null;
  portionLabel: string | null;
};

/** useActionState state for the add / edit entry form. */
export type EntryFormState = {
  status: "idle" | "error" | "saved";
  fieldErrors: EntryFieldErrors;
  formError: string | null;
  /** What the user typed, echoed back after a failed submit. */
  values: EntryFormValues;
};

export type EntryFieldName = "meal" | "unit" | "amount" | "unitGrams";
export type EntryFieldErrors = Partial<Record<EntryFieldName, string>>;
export type EntryFormValues = Partial<Record<EntryFieldName, string>>;

export const initialEntryFormState: EntryFormState = {
  status: "idle",
  fieldErrors: {},
  formError: null,
  values: {},
};
