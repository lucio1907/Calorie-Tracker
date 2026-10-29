import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { foodsStrings } from "../strings";
import { FoodSearchBar } from "./food-search-bar";

const t = foodsStrings.search;

function renderBar(filter: Parameters<typeof FoodSearchBar>[0]["filter"] = "all") {
  const onFilterChange = vi.fn();
  const onQueryChange = vi.fn();
  render(<FoodSearchBar query="" onQueryChange={onQueryChange} filter={filter} onFilterChange={onFilterChange} />);
  return { onFilterChange, onQueryChange };
}

describe("FoodSearchBar", () => {
  it("offers every category as a toggle, in order, with the current one pressed", () => {
    renderBar("custom");

    const group = screen.getByRole("group", { name: t.filterLabel });
    const chips = Array.from(group.querySelectorAll("button"));
    expect(chips.map((chip) => chip.textContent)).toEqual([
      t.filters.all,
      t.filters.custom,
      t.filters.favorites,
      t.filters.argenfoods,
      t.filters.off,
    ]);
    expect(screen.getByRole("button", { name: t.filters.custom })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: t.filters.all })).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the picked category", async () => {
    const { onFilterChange } = renderBar();

    await userEvent.click(screen.getByRole("button", { name: t.filters.custom }));

    expect(onFilterChange).toHaveBeenCalledWith("custom");
  });

  it("reports typed text", async () => {
    const { onQueryChange } = renderBar();

    await userEvent.type(screen.getByLabelText(t.label), "a");

    expect(onQueryChange).toHaveBeenCalledWith("a");
  });
});
