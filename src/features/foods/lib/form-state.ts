import type { FoodFieldErrors, FoodFormValues, PortionFieldErrors } from "./food-schema";

/** useActionState state for the create/edit food form. */
export type FoodFormState = {
  status: "idle" | "error" | "saved";
  fieldErrors: FoodFieldErrors;
  formError: string | null;
  /** What the user typed, echoed back after a failed submit. */
  values: FoodFormValues;
  foodId: number | null;
};

export const initialFoodFormState: FoodFormState = {
  status: "idle",
  fieldErrors: {},
  formError: null,
  values: {},
  foodId: null,
};

/** useActionState state for adding or editing one portion. */
export type PortionFormState = {
  status: "idle" | "error" | "saved";
  fieldErrors: PortionFieldErrors;
  formError: string | null;
  values: { label?: string; grams?: string };
  /** Increments on every successful save so the form can reset itself. */
  version: number;
};

export const initialPortionFormState: PortionFormState = {
  status: "idle",
  fieldErrors: {},
  formError: null,
  values: {},
  version: 0,
};

/** useActionState state for the barcode lookup. */
export type BarcodeLookupState = {
  status: "idle" | "found" | "error";
  foodId: number | null;
  error: string | null;
  barcode: string;
};

export const initialBarcodeLookupState: BarcodeLookupState = {
  status: "idle",
  foodId: null,
  error: null,
  barcode: "",
};
