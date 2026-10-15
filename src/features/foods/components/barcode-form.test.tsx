import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { initialBarcodeLookupState } from "../lib/form-state";
import { foodsStrings } from "../strings";
import { BarcodeForm } from "./barcode-form";

const t = foodsStrings.barcode;

describe("BarcodeForm", () => {
  it("asks for a numeric code with a visible label and hint", () => {
    render(<BarcodeForm state={initialBarcodeLookupState} />);

    const input = screen.getByLabelText(t.label);
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("name", "barcode");
    expect(input).toHaveAccessibleDescription(t.hint);
    expect(screen.getByRole("button", { name: t.submit })).toBeEnabled();
  });

  it("announces lookup errors and keeps the typed code", () => {
    render(<BarcodeForm state={{ status: "error", foodId: null, error: t.notFound, barcode: "7790000000000" }} />);

    const input = screen.getByLabelText(t.label);
    expect(input).toHaveValue("7790000000000");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(t.notFound);
  });

  it("shows progress while looking up", () => {
    render(<BarcodeForm state={initialBarcodeLookupState} pending />);

    expect(screen.getByRole("button", { name: t.submitting })).toBeDisabled();
    expect(screen.getByLabelText(t.label)).toBeDisabled();
  });
});
