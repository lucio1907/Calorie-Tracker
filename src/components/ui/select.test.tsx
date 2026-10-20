import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Select, type SelectOption } from "./select";

const FRUITS: SelectOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
  { value: "date", label: "Date" },
];

function Harness({
  initial = "",
  onChange,
  disabled = false,
  error,
}: {
  initial?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <form aria-label="Fruit form">
      <fieldset disabled={disabled}>
        <Select
          label="Fruit"
          name="fruit"
          options={FRUITS}
          value={value}
          placeholder="Choose…"
          hint="Pick one."
          error={error}
          onChange={(next) => {
            setValue(next);
            onChange?.(next);
          }}
        />
      </fieldset>
    </form>
  );
}

function submitted(): Record<string, FormDataEntryValue> {
  return Object.fromEntries(new FormData(screen.getByRole("form", { name: "Fruit form" }) as HTMLFormElement));
}

function trigger() {
  return screen.getByLabelText("Fruit");
}

describe("Select", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("names the trigger with its label, shows the placeholder and starts collapsed", () => {
    render(<Harness />);
    expect(trigger()).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveTextContent("Choose…");
    expect(trigger()).toHaveAccessibleDescription("Pick one.");
  });

  it("opens a listbox on click and selects an option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(trigger());
    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Apple", "Banana", "Cherry", "Date"]);

    await user.click(screen.getByRole("option", { name: "Cherry" }));
    expect(onChange).toHaveBeenCalledWith("cherry");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(trigger()).toHaveTextContent("Cherry");
    await waitFor(() => expect(trigger()).toHaveFocus());
  });

  it("supports arrows, Home/End and Enter from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Harness initial="banana" />);

    await user.tab();
    expect(trigger()).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    // Opens on the selected option.
    expect(screen.getByRole("option", { name: "Banana" })).toHaveFocus();
    expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: "Cherry" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("option", { name: "Date" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("option", { name: "Apple" })).toHaveFocus();

    await user.keyboard("{Enter}");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(trigger()).toHaveTextContent("Apple");
    expect(submitted()).toEqual({ fruit: "apple" });
  });

  it("closes on Escape without changing the value", async () => {
    const user = userEvent.setup();
    render(<Harness initial="apple" />);

    await user.click(trigger());
    await user.keyboard("{ArrowDown}{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(trigger()).toHaveTextContent("Apple");
    await waitFor(() => expect(trigger()).toHaveFocus());
    expect(submitted()).toEqual({ fruit: "apple" });
  });

  it("jumps to an option by typing its first letters", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(trigger());
    await user.keyboard("ch");
    expect(screen.getByRole("option", { name: "Cherry" })).toHaveFocus();
  });

  it("submits the value under its name like a native select (empty until chosen)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(submitted()).toEqual({ fruit: "" });

    await user.click(trigger());
    await user.click(screen.getByRole("option", { name: "Date" }));
    expect(submitted()).toEqual({ fruit: "date" });
  });

  it("ties an error to the trigger", () => {
    const { container } = render(<Harness error="Required." />);
    expect(container.querySelector(".group")).toHaveAttribute("data-invalid", "true");
    expect(trigger()).toHaveAccessibleDescription(expect.stringContaining("Required."));
    expect(screen.getByText("Required.")).toBeInTheDocument();
  });

  it("cannot be opened inside a disabled fieldset", async () => {
    const user = userEvent.setup();
    render(<Harness initial="apple" disabled />);
    expect(trigger()).toBeDisabled();
    await user.click(trigger());
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("still opens, selects and closes with reduced motion requested", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(trigger());
    await user.click(screen.getByRole("option", { name: "Banana" }));
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(submitted()).toEqual({ fruit: "banana" });
  });
});
