import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authStrings } from "../strings";

vi.mock("../actions/sign-out", () => ({ endSession: vi.fn(), signOut: vi.fn() }));

const { endSession, signOut } = await import("../actions/sign-out");
const { SignOutButtonContainer } = await import("./sign-out-button-container");

describe("SignOutButtonContainer", () => {
  const assign = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("location", { ...window.location, assign });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("ends the session, then loads /login as a new document", async () => {
    let finish!: () => void;
    vi.mocked(endSession).mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<SignOutButtonContainer />);

    await user.click(screen.getByRole("button", { name: authStrings.signOut }));

    // Waits for the server sign-out before leaving, and blocks a second submit meanwhile.
    expect(endSession).toHaveBeenCalledOnce();
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: authStrings.signOut })).toBeDisabled();

    finish();
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/login"));
    // The redirecting action is only the fallback for submits before hydration.
    expect(signOut).not.toHaveBeenCalled();
  });
});
