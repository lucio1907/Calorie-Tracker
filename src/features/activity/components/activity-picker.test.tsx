import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CatalogActivity } from "../lib/types";
import { activityStrings } from "../strings";
import { ActivityPicker } from "./activity-picker";

const t = activityStrings;

const catalog: CatalogActivity[] = [
  { id: 2, name: "Running, 10 km/h", met: 9.3, category: "running" },
  { id: 3, name: "Yoga, general", met: 2.3, category: "gym" },
];

describe("ActivityPicker", () => {
  it("lists activities with their MET and picks one", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<ActivityPicker query="" onQueryChange={vi.fn()} activities={catalog} onPick={onPick} />);

    const list = screen.getByRole("list", { name: t.add.catalog });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("MET 9.3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Yoga, general/ }));
    expect(onPick).toHaveBeenCalledWith(catalog[1]);
  });

  it("reports typed queries", async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    render(<ActivityPicker query="" onQueryChange={onQueryChange} activities={catalog} onPick={vi.fn()} />);

    await user.type(screen.getByLabelText(t.add.search), "y");
    expect(onQueryChange).toHaveBeenCalledWith("y");
  });

  it("says when nothing matches", () => {
    render(<ActivityPicker query=" rowing " onQueryChange={vi.fn()} activities={[]} onPick={vi.fn()} />);
    expect(screen.getByText(t.add.noResults("rowing"))).toBeInTheDocument();
  });
});
