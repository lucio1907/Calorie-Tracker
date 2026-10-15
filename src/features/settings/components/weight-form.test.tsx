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

  it("keeps the typed value and shows the error after a failed submit", () => {
    const error = settingsStrings.validation.weightRange(20, 400);
    render(<WeightForm state={{ status: "error", fieldError: error, formError: null, value: "800" }} />);

    const kg = screen.getByLabelText(w.kg);
    expect(kg).toHaveValue("800");
    expect(kg).toHaveAttribute("aria-invalid", "true");
    expect(kg).toHaveAccessibleDescription(`${error} ${w.hint}`);
  });

  it("confirms a save", () => {
    render(<WeightForm state={{ status: "saved", fieldError: null, formError: null, value: "" }} />);

    expect(screen.getByRole("status")).toHaveTextContent(w.saved);
  });
});
