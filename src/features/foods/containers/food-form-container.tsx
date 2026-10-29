"use client";

import { useActionState, useState } from "react";
import { Button, Dialog } from "@/components/ui";
import { createFood, updateFood } from "../actions/food-actions";
import { FoodForm } from "../components/food-form";
import { toInputValue } from "../lib/format";
import type { FoodFormValues } from "../lib/food-schema";
import { initialFoodFormState, type FoodFormState } from "../lib/form-state";
import type { FoodDetail } from "../lib/types";
import { foodsStrings } from "../strings";

const t = foodsStrings.form.addAnother;

type FoodFormContainerProps = {
  /** The food being edited; omitted when creating. */
  food?: FoodDetail;
  /** After an edit, or after a create once the user declines adding another. */
  onSaved: (foodId: number) => void;
  /** After a create when the user chooses to add another (the form starts over). */
  onAddAnother?: (foodId: number) => void;
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

/**
 * Wires FoodForm to the createFood / updateFood Server Actions. After a
 * create it asks whether to add another food: yes starts an empty form,
 * no (or Esc) continues with the created one.
 */
export function FoodFormContainer({ food, onSaved, onAddAnother, onCancel }: FoodFormContainerProps) {
  const [created, setCreated] = useState<number | null>(null);
  // A new key remounts the form, so "add another" starts from empty fields.
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(async (previous: FoodFormState, formData: FormData) => {
    const next = await (food ? updateFood(previous, formData) : createFood(previous, formData));
    if (next.status === "saved" && next.foodId !== null) {
      if (food) onSaved(next.foodId);
      else setCreated(next.foodId);
    }
    return next;
  }, initialFoodFormState);

  function addAnother(foodId: number) {
    setCreated(null);
    setFormKey((key) => key + 1);
    onAddAnother?.(foodId);
  }

  function finish(foodId: number) {
    setCreated(null);
    onSaved(foodId);
  }

  return (
    <>
      <FoodForm
        key={formKey}
        state={state}
        action={formAction}
        pending={pending}
        defaults={food ? toDefaults(food) : undefined}
        foodId={food?.id}
        onCancel={onCancel}
      />
      <Dialog
        open={created !== null}
        onClose={() => (created !== null ? finish(created) : undefined)}
        title={t.title}
        description={t.description}
      >
        <Button onClick={() => created !== null && finish(created)}>{t.no}</Button>
        <Button variant="primary" onClick={() => created !== null && addAnother(created)}>
          {t.yes}
        </Button>
      </Dialog>
    </>
  );
}
