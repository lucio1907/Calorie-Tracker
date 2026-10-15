import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { initialSignInState } from "../lib/sign-in-state";
import { authStrings } from "../strings";
import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("labels both fields and offers a submit button", () => {
    render(<LoginForm state={initialSignInState} />);

    expect(screen.getByLabelText(authStrings.emailLabel)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(authStrings.passwordLabel)).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: authStrings.submit })).toBeEnabled();
  });

  it("ties field errors to their inputs and keeps the typed email", () => {
    render(
      <LoginForm
        state={{ email: "owner", fieldErrors: { email: authStrings.emailInvalid }, formError: null }}
      />,
    );

    const email = screen.getByLabelText(authStrings.emailLabel);
    expect(email).toHaveValue("owner");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription(authStrings.emailInvalid);
  });

  it("announces form-level errors", () => {
    render(<LoginForm state={{ ...initialSignInState, formError: authStrings.invalidCredentials }} />);

    expect(screen.getByRole("alert")).toHaveTextContent(authStrings.invalidCredentials);
  });

  it("disables inputs and shows progress while pending", () => {
    render(<LoginForm state={initialSignInState} pending />);

    expect(screen.getByRole("button", { name: authStrings.submitting })).toBeDisabled();
    expect(screen.getByLabelText(authStrings.emailLabel)).toBeDisabled();
  });

  it("carries the post-login destination", () => {
    const { container } = render(<LoginForm state={initialSignInState} next="/diary" />);

    expect(container.querySelector('input[name="next"]')).toHaveValue("/diary");
  });
});
