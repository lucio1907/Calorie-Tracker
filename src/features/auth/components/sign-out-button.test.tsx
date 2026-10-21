import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { authStrings } from "../strings";
import { SignOutButton } from "./sign-out-button";

describe("SignOutButton", () => {
  it("offers a sign-out submit button", () => {
    render(<SignOutButton />);

    const button = screen.getByRole("button", { name: authStrings.signOut });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toBeEnabled();
  });

  it("disables the button while signing out", () => {
    const { container } = render(<SignOutButton pending />);

    expect(screen.getByRole("button", { name: authStrings.signOut })).toBeDisabled();
    expect(container.querySelector("form")).toHaveAttribute("aria-busy", "true");
  });
});
