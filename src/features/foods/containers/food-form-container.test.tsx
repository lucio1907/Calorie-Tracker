import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FoodFormState } from "../lib/form-state";
import type { FoodDetail } from "../lib/types";
import { foodsStrings } from "../strings";
import { FoodFormContainer } from "./food-form-container";

const createFood = vi.fn();
const updateFood = vi.fn();
vi.mock("../actions/food-actions", () => ({
  createFood: (...args: unknown[]) => createFood(...args),
  updateFood: (...args: unknown[]) => updateFood(...args),
}));

// jsdom has no modal dialogs: open/close the <dialog> by toggling its attribute.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute("open");
};

const f = foodsStrings.form;

function saved(foodId: number): FoodFormState {
  return { status: "saved", fieldErrors: {}, formError: null, values: {}, foodId } as FoodFormState;
}

async function fillAndSave(name: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(f.name), name);
  await user.type(screen.getByLabelText(f.kcal), "100");
  await user.type(screen.getByLabelText(f.protein), "1");
  await user.type(screen.getByLabelText(f.carbs), "2");
  await user.type(screen.getByLabelText(f.fat), "3");
  await user.click(screen.getByRole("button", { name: f.save }));
}

beforeEach(() => {
  createFood.mockReset();
  updateFood.mockReset();
});

describe("FoodFormContainer", () => {
  it("asks after a create whether to add another, and starts an empty form on yes", async () => {
    createFood.mockResolvedValueOnce(saved(5));
    const onSaved = vi.fn();
    const onAddAnother = vi.fn();
    render(<FoodFormContainer onSaved={onSaved} onAddAnother={onAddAnother} onCancel={vi.fn()} />);

    await fillAndSave("Tarta");
    const dialog = await screen.findByRole("dialog", { name: f.addAnother.title });
    expect(dialog).toHaveAccessibleDescription(f.addAnother.description);
    expect(onSaved).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: f.addAnother.yes }));

    expect(onAddAnother).toHaveBeenCalledWith(5);
    expect(onSaved).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText(f.name)).toHaveValue("");
  });

  it("continues with the created food on no", async () => {
    createFood.mockResolvedValueOnce(saved(6));
    const onSaved = vi.fn();
    render(<FoodFormContainer onSaved={onSaved} onCancel={vi.fn()} />);

    await fillAndSave("Tarta");
    await userEvent.click(await screen.findByRole("button", { name: f.addAnother.no }));

    expect(onSaved).toHaveBeenCalledWith(6);
  });

  it("saves an edit without asking", async () => {
    updateFood.mockResolvedValueOnce(saved(7));
    const onSaved = vi.fn();
    const food = {
      id: 7, name: "Pan", brand: null, barcode: null, source: "custom", group: null,
      kcal: 250, protein: 8, carbs: 50, fat: 2, fiber: null, sodiumMg: null,
      isOwn: true, isFavorite: false, portions: [],
    } as unknown as FoodDetail;
    render(<FoodFormContainer food={food} onSaved={onSaved} onCancel={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: f.save }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(7));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
