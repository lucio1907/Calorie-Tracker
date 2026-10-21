import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { settingsStrings } from "../strings";
import { TwoFactorEnrollForm } from "./two-factor-forms";

const f = settingsStrings.twoFactor;

describe("TwoFactorEnrollForm", () => {
  it("starts with a single setup button", () => {
    render(<TwoFactorEnrollForm state={{ status: "idle", formError: null }} />);
    expect(screen.getByRole("button", { name: f.start })).toBeEnabled();
    expect(screen.queryByLabelText(f.code)).not.toBeInTheDocument();
  });

  it("shows the QR code, the setup key and a one-time-code field while enrolling", () => {
    render(
      <TwoFactorEnrollForm
        state={{
          status: "enrolling",
          factorId: "factor-1",
          qrCode: "data:image/svg+xml;utf-8,<svg/>",
          secret: "SECRETKEY",
          fieldError: settingsStrings.validation.totpCodeIncorrect,
          formError: null,
        }}
      />,
    );

    expect(screen.getByRole("img", { name: f.qrAlt })).toHaveAttribute("src", "data:image/svg+xml;utf-8,<svg/>");
    expect(screen.getByText("SECRETKEY")).toBeInTheDocument();
    const code = screen.getByLabelText(f.code);
    expect(code).toHaveAttribute("inputmode", "numeric");
    expect(code).toHaveAttribute("autocomplete", "one-time-code");
    expect(code).toHaveAccessibleDescription(settingsStrings.validation.totpCodeIncorrect);
  });
});
