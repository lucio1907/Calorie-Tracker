import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatePicker } from "./date-picker";

const MIN = "1900-01-02";
const MAX = "2008-10-15";

function Harness({ initial = "", onChange }: { initial?: string; onChange?: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <form aria-label="Profile">
      <DatePicker
        label="Birth date"
        name="birthDate"
        value={value}
        min={MIN}
        max={MAX}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
    </form>
  );
}

function submitted() {
  return Object.fromEntries(new FormData(screen.getByRole("form", { name: "Profile" }) as HTMLFormElement));
}

async function openCalendar(user: ReturnType<typeof userEvent.setup>) {
  // The icon button is named by the field label ("Calendar Birth date" in React Aria).
  await user.click(screen.getByRole("button", { name: /Birth date/ }));
  return screen.findByRole("grid");
}

function day(grid: HTMLElement, name: RegExp) {
  return within(grid).getByRole("button", { name });
}

describe("DatePicker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits the date as YYYY-MM-DD under its name, and empty until set", () => {
    const { unmount } = render(<Harness initial="1996-01-10" />);
    expect(submitted()).toEqual({ birthDate: "1996-01-10" });
    expect(screen.getByRole("group", { name: "Birth date" })).toHaveTextContent("10/1/1996");
    unmount();

    render(<Harness />);
    expect(submitted()).toEqual({ birthDate: "" });
  });

  it("accepts a typed date in the day/month/year segments", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: /día/i }));
    await user.keyboard("19071990");

    expect(onChange).toHaveBeenLastCalledWith("1990-07-19");
    expect(submitted()).toEqual({ birthDate: "1990-07-19" });
  });

  it("opens a Monday-first calendar on the selected day with days after the max disabled", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2008-10-01" />);
    const grid = await openCalendar(user);

    const headers = within(grid).getAllByRole("columnheader", { hidden: true }).map((cell) => cell.textContent);
    expect(headers).toEqual(["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]);
    await waitFor(() => expect(day(grid, /, 1 de octubre de 2008/)).toHaveFocus());
    expect(day(grid, /, 15 de octubre de 2008/)).not.toHaveAttribute("aria-disabled");
    expect(day(grid, /, 16 de octubre de 2008/)).toHaveAttribute("aria-disabled", "true");
  });

  it("moves through the grid with the keyboard and picks with Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial="1996-01-10" onChange={onChange} />);
    const grid = await openCalendar(user);
    await waitFor(() => expect(day(grid, /, 10 de enero de 1996/)).toHaveFocus());

    await user.keyboard("{ArrowRight}{ArrowDown}");
    expect(day(grid, /, 18 de enero de 1996/)).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenLastCalledWith("1996-01-18");
    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    expect(submitted()).toEqual({ birthDate: "1996-01-18" });
  });

  it("jumps decades back with the year dropdown", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial="2000-03-10" onChange={onChange} />);
    await openCalendar(user);

    await user.click(screen.getByRole("button", { name: /^2000 Año/ }));
    await user.click(await screen.findByRole("option", { name: "1975" }));
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    // The month stays March.
    const grid = screen.getByRole("grid");
    expect(grid).toHaveAccessibleName(/marzo de 1975/);
    await user.click(day(grid, /, 4 de marzo de 1975/));

    expect(onChange).toHaveBeenLastCalledWith("1975-03-04");
  });

  it("does not offer years outside min/max", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2000-03-10" />);
    await openCalendar(user);

    await user.click(screen.getByRole("button", { name: /^2000 Año/ }));
    const years = (await screen.findAllByRole("option")).map((option) => option.textContent);
    expect(years[0]).toBe("1900");
    expect(years.at(-1)).toBe("2008");
  });

  it("works the same with reduced motion requested", async () => {
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
    render(<Harness initial="1996-01-10" />);
    const grid = await openCalendar(user);
    await user.click(day(grid, /, 20 de enero de 1996/));

    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    expect(submitted()).toEqual({ birthDate: "1996-01-20" });
  });
});
