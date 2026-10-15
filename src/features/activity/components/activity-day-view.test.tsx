import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildActivityDay } from "../lib/activity-day";
import type { ActivityEntry } from "../lib/types";
import { activityStrings } from "../strings";
import { ActivityDayView, WeightNotice } from "./activity-day-view";

const t = activityStrings;

const run: ActivityEntry = { id: 1, activityId: 8, label: "Running, 10 km/h", minutes: 30, kcal: 326 };
const yoga: ActivityEntry = { id: 2, activityId: 21, label: "Yoga, general", minutes: 45, kcal: 120.4 };

describe("ActivityDayView", () => {
  it("lists each entry with its duration and kcal, plus the day total", () => {
    render(<ActivityDayView day={buildActivityDay([run, yoga])} onEdit={vi.fn()} />);

    const list = screen.getByRole("list", { name: t.day.entries });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Running, 10 km/h")).toBeInTheDocument();
    expect(within(rows[0]).getByText("30 min")).toBeInTheDocument();
    expect(within(rows[0]).getByText("326")).toBeInTheDocument();
    expect(within(rows[1]).getByText("45 min")).toBeInTheDocument();

    const total = screen.getByRole("region", { name: t.day.totalHeading });
    // 326 + 120.4 = 446.4 kcal -> "446"; 75 minutes.
    expect(within(total).getByText("446")).toBeInTheDocument();
    expect(within(total).getByText("· 75 min")).toBeInTheDocument();
  });

  it("says when nothing was logged, with a zero total", () => {
    render(<ActivityDayView day={buildActivityDay([])} onEdit={vi.fn()} />);

    expect(screen.getByText(t.day.empty)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: t.day.entries })).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: t.day.totalHeading })).getByText("0")).toBeInTheDocument();
  });

  it("opens the editor for an entry", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<ActivityDayView day={buildActivityDay([run])} onEdit={onEdit} />);

    await user.click(screen.getByRole("button", { name: /Running, 10 km\/h/ }));
    expect(onEdit).toHaveBeenCalledWith(run);
  });
});

describe("WeightNotice", () => {
  it("names the weight the kcal use", () => {
    render(<WeightNotice weight={{ kg: 80.5, date: "2026-10-14" }} today="2026-10-15" />);
    expect(screen.getByText(t.weight.using("80.5", "Wednesday, October 14"))).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("asks for a weight and links to Settings when none is logged", () => {
    render(<WeightNotice weight={null} today="2026-10-15" />);
    expect(screen.getByText(t.weight.missing)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.weight.missingAction })).toHaveAttribute("href", "/settings");
  });
});
