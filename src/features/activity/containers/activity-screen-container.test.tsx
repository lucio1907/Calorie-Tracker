import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildActivityDay } from "../lib/activity-day";
import type { CatalogActivity } from "../lib/types";
import { activityStrings } from "../strings";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../actions/activity-actions", () => ({
  createActivityEntry: vi.fn(),
  updateActivityEntry: vi.fn(),
  deleteActivityEntry: vi.fn(),
}));

// jsdom has no modal dialogs: open/close the <dialog> the Sheet renders by toggling its attribute.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute("open");
};

const { ActivityScreenContainer } = await import("./activity-screen-container");

const t = activityStrings;

const catalog: CatalogActivity[] = [
  { id: 2, name: "Running, 10 km/h", met: 9.3, category: "running" },
  { id: 3, name: "Yoga, general", met: 2.3, category: "gym" },
];

const props = {
  date: "2026-10-15",
  today: "2026-10-15",
  day: buildActivityDay([]),
  catalog,
  weight: { kg: 70, date: "2026-10-15" },
};

describe("ActivityScreenContainer", () => {
  it("shows an empty day with the add action and date navigation on /activity", () => {
    render(<ActivityScreenContainer {...props} />);

    expect(screen.getByText(t.day.empty)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.logActivity })).toBeInTheDocument();
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByRole("link", { name: "Día anterior" })).toHaveAttribute("href", "/activity?date=2026-10-14");
  });

  it("blocks adding and links to Settings when no weight is logged", () => {
    render(<ActivityScreenContainer {...props} weight={null} />);

    expect(screen.queryByRole("button", { name: t.logActivity })).not.toBeInTheDocument();
    expect(screen.getByText(t.weight.missing)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.weight.missingAction })).toHaveAttribute("href", "/settings");
  });

  it("opens a searchable catalog and the duration form for the picked activity", async () => {
    const user = userEvent.setup();
    render(<ActivityScreenContainer {...props} />);

    await user.click(screen.getByRole("button", { name: t.logActivity }));
    await user.type(screen.getByLabelText(t.add.search), "yoga");
    const list = screen.getByRole("list", { name: t.add.catalog });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);

    await user.click(within(list).getByRole("button", { name: /Yoga, general/ }));
    expect(screen.getByLabelText(t.form.minutes)).toHaveValue("30");
    // (2.3 - 1) x 70 x 0.5 h = 45.5 -> 46.
    expect(screen.getByText("46")).toBeInTheDocument();
  });
});
