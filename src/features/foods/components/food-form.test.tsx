import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { initialFoodFormState } from "../lib/form-state";
import { foodsStrings } from "../strings";
import { FoodForm } from "./food-form";

const f = foodsStrings.form;

describe("FoodForm", () => {
  it("labels every field and marks nutrients for decimal input", () => {
    render(<FoodForm state={initialFoodFormState} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(f.name)).toBeRequired();
    expect(screen.getByLabelText(f.brand)).not.toBeRequired();
    expect(screen.getByLabelText(f.barcode)).toHaveAttribute("inputmode", "numeric");
    for (const label of [f.kcal, f.protein, f.carbs, f.fat]) {
      expect(screen.getByLabelText(label)).toHaveAttribute("inputmode", "decimal");
      expect(screen.getByLabelText(label)).toBeRequired();
    }
    expect(screen.getByLabelText(f.fiber)).not.toBeRequired();
    expect(screen.getByRole("button", { name: f.save })).toBeEnabled();
  });

  it("prefills an edited food and carries its id", () => {
    const { container } = render(
      <FoodForm state={initialFoodFormState} onCancel={vi.fn()} foodId={42} defaults={{ name: "Granola", kcal: "450" }} />,
    );

    expect(screen.getByLabelText(f.name)).toHaveValue("Granola");
    expect(screen.getByLabelText(f.kcal)).toHaveValue("450");
    expect(container.querySelector('input[name="foodId"]')).toHaveValue("42");
  });

  it("shows the typed values and ties errors to their fields after a failed submit", () => {
    render(
      <FoodForm
        state={{
          ...initialFoodFormState,
          status: "error",
          values: { name: "Granola", kcal: "1420" },
          fieldErrors: { kcal: foodsStrings.validation.range(0, 900) },
          formError: foodsStrings.validation.fix,
        }}
        defaults={{ name: "Old name" }}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(foodsStrings.validation.fix);
    expect(screen.getByLabelText(f.name)).toHaveValue("Granola");
    const kcal = screen.getByLabelText(f.kcal);
    expect(kcal).toHaveValue("1420");
    expect(kcal).toHaveAttribute("aria-invalid", "true");
    expect(kcal).toHaveAccessibleDescription(foodsStrings.validation.range(0, 900));
  });

  it("disables the form while saving", () => {
    render(<FoodForm state={initialFoodFormState} pending onCancel={vi.fn()} />);

    expect(screen.getByRole("button", { name: f.saving })).toBeDisabled();
    expect(screen.getByLabelText(f.name)).toBeDisabled();
  });
});
