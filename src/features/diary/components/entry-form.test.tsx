import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { chooseOption, formValues } from "@/test-support/choose-option";
import { initialEntryFormState, type EntryFormState } from "../lib/types";
import { diaryStrings } from "../strings";
import { EntryForm, type EntryFormFood } from "./entry-form";

const t = diaryStrings;

const bread: EntryFormFood = {
  name: "Pan francés",
  kcal: 269,
  protein: 9.3,
  carbs: 57.4,
  fat: 0.2,
  portions: [{ id: 1, label: "1 roll", grams: 50 }],
};

function renderForm(overrides: Partial<Parameters<typeof EntryForm>[0]> = {}) {
  return render(
    <EntryForm
      food={bread}
      title={bread.name}
      defaults={{ meal: "lunch", unit: "1", amount: "1" }}
      hidden={{ date: "2026-10-14", foodId: "7" }}
      submitLabel={t.entryForm.save}
      state={initialEntryFormState}
      {...overrides}
    />,
  );
}

function preview() {
  return within(screen.getByRole("status"));
}

describe("EntryForm", () => {
  it("previews kcal and macros for the default portion", () => {
    renderForm();
    // 1 roll = 50 g: 134.5 kcal -> "135"; P 4.65 -> "4,7".
    expect(preview().getByText("135")).toBeInTheDocument();
    expect(preview().getByText("· 50 g")).toBeInTheDocument();
    expect(preview().getByText(/Proteínas 4,7 g/)).toBeInTheDocument();
  });

  it("updates the preview as the quantity changes, accepting a decimal comma", async () => {
    const user = userEvent.setup();
    renderForm();
    const amount = screen.getByLabelText(t.entryForm.quantity);
    await user.clear(amount);
    await user.type(amount, "1,5");
    // 75 g of bread: 201.75 kcal -> "202".
    expect(preview().getByText("202")).toBeInTheDocument();
    expect(preview().getByText("· 75 g")).toBeInTheDocument();
  });

  it("switches to grams keeping the same amount of food", async () => {
    const user = userEvent.setup();
    renderForm({ defaults: { meal: "lunch", unit: "1", amount: "2" } });
    await chooseOption(user, t.entryForm.unit, t.units.gramsOption);
    expect(screen.getByLabelText(t.entryForm.grams)).toHaveValue("100");
    expect(preview().getByText("269")).toBeInTheDocument();
  });

  it("keeps the chosen meal and unit after a submit, so a resubmit sends the same food amount", async () => {
    const user = userEvent.setup();
    const submitted: FormData[] = [];
    const { container } = renderForm({
      defaults: { meal: "lunch", unit: "1", amount: "2" },
      action: async (formData) => {
        submitted.push(formData);
      },
    });
    await chooseOption(user, t.entryForm.meal, t.meals.dinner);
    await chooseOption(user, t.entryForm.unit, t.units.gramsOption);
    await user.click(screen.getByRole("button", { name: t.entryForm.save }));

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(Object.fromEntries(new FormData(container.querySelector("form") ?? undefined))).toMatchObject({
      meal: "dinner",
      unit: "g",
      amount: "100",
    });
  });

  it("asks for an amount instead of showing a stale preview", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.clear(screen.getByLabelText(t.entryForm.quantity));
    expect(preview().getByText(t.entryForm.previewEmpty)).toBeInTheDocument();
  });

  it("submits the hidden ids with the visible fields", () => {
    const { container } = renderForm();
    const form = container.querySelector("form");
    const data = new FormData(form ?? undefined);
    expect(Object.fromEntries(data)).toEqual({ date: "2026-10-14", foodId: "7", meal: "lunch", unit: "1", amount: "1" });
  });

  it("shows field and form errors from the server", () => {
    const state: EntryFormState = {
      status: "error",
      fieldErrors: { amount: t.validation.quantityRange },
      formError: t.validation.fix,
      values: {},
    };
    renderForm({ state });
    expect(screen.getByRole("alert")).toHaveTextContent(t.validation.fix);
    expect(screen.getByLabelText(t.entryForm.quantity)).toHaveAccessibleDescription(t.validation.quantityRange);
  });

  it("offers 'unidad' for a food without one and asks for the weight of 1 unit", async () => {
    const user = userEvent.setup();
    const { container } = renderForm({ canDefineUnit: true });
    expect(screen.queryByLabelText(t.entryForm.unitGrams)).not.toBeInTheDocument();

    await chooseOption(user, t.entryForm.unit, t.units.newUnitOption);
    const amount = screen.getByLabelText(t.entryForm.quantity);
    await user.clear(amount);
    await user.type(amount, "2");
    expect(preview().getByText(t.entryForm.previewEmpty)).toBeInTheDocument();

    await user.type(screen.getByLabelText(t.entryForm.unitGrams), "25");
    // 2 units x 25 g = 50 g of bread: 134.5 kcal -> "135".
    expect(preview().getByText("· 50 g")).toBeInTheDocument();
    expect(preview().getByText("135")).toBeInTheDocument();
    expect(formValues(container.querySelector("form"))).toMatchObject({ unit: "unit", amount: "2", unitGrams: "25" });
  });

  it("lists the user's unit as a normal option once it exists, without the weight field", async () => {
    const user = userEvent.setup();
    const withUnit = { ...bread, portions: [...bread.portions, { id: 8, label: "unidad", grams: 25 }] };
    renderForm({ food: withUnit, canDefineUnit: true });

    await user.click(screen.getByLabelText(t.entryForm.unit));
    const options = (await screen.findAllByRole("option")).map((option) => option.textContent);
    expect(options).toEqual([
      t.units.portionOption("1 roll", "50"),
      t.units.portionOption("unidad", "25"),
      t.units.gramsOption,
    ]);
    await user.click(screen.getByRole("option", { name: t.units.portionOption("unidad", "25") }));
    expect(screen.queryByLabelText(t.entryForm.unitGrams)).not.toBeInTheDocument();
    expect(preview().getByText("· 25 g")).toBeInTheDocument();
  });

  it("does not offer 'unidad' when units cannot be defined (recipes)", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByLabelText(t.entryForm.unit));
    const options = (await screen.findAllByRole("option")).map((option) => option.textContent);
    expect(options).toEqual([t.units.portionOption("1 roll", "50"), t.units.gramsOption]);
  });

  it("shows the server's error on the unit weight", () => {
    const state: EntryFormState = {
      status: "error",
      fieldErrors: { unitGrams: t.validation.required },
      formError: t.validation.fix,
      values: {},
    };
    renderForm({ canDefineUnit: true, defaults: { meal: "lunch", unit: "unit", amount: "2" }, state });
    expect(screen.getByLabelText(t.entryForm.unitGrams)).toHaveAccessibleDescription(
      expect.stringContaining(t.validation.required),
    );
  });

  it("only offers the meal when the food was deleted, and shows the logged values", () => {
    renderForm({
      food: null,
      title: "Old food",
      logged: { grams: 80, nutrients: { kcal: 120, protein: 1, carbs: 2, fat: 3 } },
    });
    expect(screen.getByText(t.entryForm.foodDeleted)).toBeInTheDocument();
    expect(screen.getByLabelText(t.entryForm.meal)).toBeInTheDocument();
    expect(screen.queryByLabelText(t.entryForm.unit)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(t.entryForm.quantity)).not.toBeInTheDocument();
    expect(preview().getByText("120")).toBeInTheDocument();
  });
});
