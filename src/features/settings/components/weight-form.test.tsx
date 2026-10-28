import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { initialWeightFormState } from "../lib/types";
import { settingsStrings } from "../strings";
import { WeightForm } from "./weight-form";

const w = settingsStrings.weight;

describe("WeightForm", () => {
  it("asks for today's weight with a decimal keyboard", () => {
    render(<WeightForm state={initialWeightFormState} />);

    const kg = screen.getByLabelText(w.kg);
    expect(kg).toHaveAttribute("inputmode", "decimal");
    expect(kg).toHaveAccessibleDescription(w.hint);
    expect(kg).toHaveValue("");
    expect(screen.getByRole("button", { name: w.save })).toBeEnabled();
  });

  it("starts with the latest logged weight", () => {
    render(<WeightForm state={initialWeightFormState} latestKg="78,5" />);

    expect(screen.getByLabelText(w.kg)).toHaveValue("78,5");
  });

  it("keeps the typed value and shows the error after a failed submit", () => {
    const error = settingsStrings.validation.weightRange(20, 400);
    render(<WeightForm state={{ status: "error", fieldError: error, formError: null, value: "800" }} latestKg="78,5" />);

    const kg = screen.getByLabelText(w.kg);
    expect(kg).toHaveValue("800");
    expect(kg).toHaveAttribute("aria-invalid", "true");
    expect(kg).toHaveAccessibleDescription(`${error} ${w.hint}`);
  });

  it("confirms a save and keeps the saved weight in the field", () => {
    render(<WeightForm state={{ status: "saved", fieldError: null, formError: null, value: "" }} latestKg="79" />);

    expect(screen.getByRole("status")).toHaveTextContent(w.saved);
    expect(screen.getByLabelText(w.kg)).toHaveValue("79");
  });
});
