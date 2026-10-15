"use client";

import { useActionState } from "react";
import { createFood, updateFood } from "../actions/food-actions";
import { FoodForm } from "../components/food-form";
import { toInputValue } from "../lib/format";
import type { FoodFormValues } from "../lib/food-schema";
import { initialFoodFormState, type FoodFormState } from "../lib/form-state";
import type { FoodDetail } from "../lib/types";

type FoodFormContainerProps = {
  /** The food being edited; omitted when creating. */
  food?: FoodDetail;
  onSaved: (foodId: number) => void;
  onCancel: () => void;
};

function toDefaults(food: FoodDetail): FoodFormValues {
  return {
    name: food.name,
    brand: food.brand ?? "",
    barcode: food.barcode ?? "",
    kcal: toInputValue(food.kcal),
    protein: toInputValue(food.protein),
    carbs: toInputValue(food.carbs),
    fat: toInputValue(food.fat),
    fiber: toInputValue(food.fiber),
    sodiumMg: toInputValue(food.sodiumMg),
  };
}

/** Wires FoodForm to the createFood / updateFood Server Actions. */
export function FoodFormContainer({ food, onSaved, onCancel }: FoodFormContainerProps) {
  const [state, formAction, pending] = useActionState(async (previous: FoodFormState, formData: FormData) => {
    const next = await (food ? updateFood(previous, formData) : createFood(previous, formData));
    if (next.status === "saved" && next.foodId !== null) onSaved(next.foodId);
    return next;
  }, initialFoodFormState);

  return (
    <FoodForm
      state={state}
      action={formAction}
      pending={pending}
      defaults={food ? toDefaults(food) : undefined}
      foodId={food?.id}
      onCancel={onCancel}
    />
  );
}
