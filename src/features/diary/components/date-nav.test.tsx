import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { diaryStrings } from "../strings";
import { DateNav } from "./date-nav";

const t = diaryStrings.dateNav;
const TODAY = "2026-10-15";

function openCalendar(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole("button", { name: new RegExp(t.pickDate) })).then(() => screen.findByRole("grid"));
}

describe("DateNav", () => {
  it("links the previous and next days and keeps today as the bare path", () => {
    render(<DateNav date="2026-10-14" today={TODAY} onPick={vi.fn()} basePath="/activity" />);

    expect(screen.getByRole("link", { name: t.previous })).toHaveAttribute("href", "/activity?date=2026-10-13");
    expect(screen.getByRole("link", { name: t.next })).toHaveAttribute("href", "/activity");
    expect(screen.getByRole("link", { name: t.today })).toHaveAttribute("href", "/activity");
    expect(screen.getByRole("button", { name: new RegExp(t.pickDate) })).toHaveTextContent(t.relative.yesterday);
  });

  it("opens a calendar on the shown day with today highlighted", async () => {
    const user = userEvent.setup();
    render(<DateNav date="2026-10-10" today={TODAY} onPick={vi.fn()} />);
    const grid = await openCalendar(user);

    const shown = within(grid).getByRole("button", { name: /October 10, 2026/ });
    await waitFor(() => expect(shown).toHaveFocus());
    expect(shown.closest("[role=gridcell]")).toHaveAttribute("aria-selected", "true");
    // Highlighted from the `today` prop (the app time zone), not from the browser clock.
    expect(within(grid).getByRole("button", { name: /October 15, 2026/ })).toHaveClass("ring-brand");
    expect(within(grid).getByRole("button", { name: /October 14, 2026/ })).not.toHaveClass("ring-brand");
  });

  it("jumps to a picked day with the keyboard and closes", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<DateNav date={TODAY} today={TODAY} onPick={onPick} />);
    const grid = await openCalendar(user);
    await waitFor(() => expect(within(grid).getByRole("button", { name: /October 15, 2026/ })).toHaveFocus());

    await user.keyboard("{ArrowUp}{Enter}");

    expect(onPick).toHaveBeenCalledWith("2026-10-08");
    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
  });

  it("does not report the day already shown", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<DateNav date={TODAY} today={TODAY} onPick={onPick} />);
    const grid = await openCalendar(user);

    await user.click(within(grid).getByRole("button", { name: /October 15, 2026/ }));
    expect(onPick).not.toHaveBeenCalled();
  });

  it("stops at the first supported day", async () => {
    const user = userEvent.setup();
    render(<DateNav date="2000-01-01" today={TODAY} onPick={vi.fn()} />);

    expect(screen.queryByRole("link", { name: t.previous })).not.toBeInTheDocument();
    const grid = await openCalendar(user);
    expect(grid).toHaveAccessibleName(/January 2000/);
    const previousMonth = screen.getAllByRole("button", { name: /previous/i }).find((button) => button.getAttribute("slot") === "previous");
    expect(previousMonth).toBeDisabled();
  });
});
