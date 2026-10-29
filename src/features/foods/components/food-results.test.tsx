import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FoodSummary } from "../lib/types";
import { foodsStrings } from "../strings";
import { FoodResults } from "./food-results";

const t = foodsStrings.search;

const arroz: FoodSummary = {
  id: 1,
  name: "Arroz, grano, blanco, pulido, crudo",
  brand: null,
  source: "argenfoods",
  group: "Cereales y derivados",
  kcal: 339,
  protein: 6.9,
  carbs: 77.5,
  fat: 0.2,
  isOwn: false,
  isFavorite: true,
};

const polenta: FoodSummary = {
  ...arroz,
  id: 2,
  name: "Polenta Instantánea",
  brand: "Arcor",
  source: "off",
  group: null,
  kcal: 340,
  isOwn: true,
  isFavorite: false,
};

function renderResults(props: Partial<Parameters<typeof FoodResults>[0]> = {}) {
  const handlers = { onSelect: vi.fn(), onRetry: vi.fn(), onSearchOff: vi.fn() };
  render(<FoodResults foods={[arroz, polenta]} status="idle" query="" filter="all" {...handlers} {...props} />);
  return handlers;
}

describe("FoodResults", () => {
  it("lists foods with a source badge, kcal per 100 g and the favorite mark", () => {
    renderResults();

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText(foodsStrings.sources.argenfoods)).toBeInTheDocument();
    expect(within(rows[0]).getByText("339")).toBeInTheDocument();
    expect(within(rows[0]).getByRole("img", { name: t.favorite })).toBeInTheDocument();
    expect(within(rows[1]).getByText(foodsStrings.sources.off)).toBeInTheDocument();
    expect(within(rows[1]).getByText("Arcor")).toBeInTheDocument();
    expect(within(rows[1]).queryByRole("img", { name: t.favorite })).not.toBeInTheDocument();
    expect(screen.getByText(`${t.resultCount(2)} · ${t.perHundred}`)).toBeInTheDocument();
  });

  it("opens a food when its row is activated", async () => {
    const { onSelect } = renderResults();

    await userEvent.click(screen.getByRole("button", { name: /Polenta Instantánea/ }));

    expect(onSelect).toHaveBeenCalledWith(polenta);
  });

  it("marks the list busy while a search is running", () => {
    renderResults({ status: "loading" });

    expect(screen.getByRole("region", { name: t.resultsHeading })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(t.loading)).toBeInTheDocument();
  });

  it("offers a retry when the search fails", async () => {
    const { onRetry } = renderResults({ status: "error" });

    expect(screen.getByRole("alert")).toHaveTextContent(t.error);
    await userEvent.click(screen.getByRole("button", { name: t.retry }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("suggests Open Food Facts when nothing matches", async () => {
    const { onSearchOff } = renderResults({ foods: [], query: "galletitas" });

    expect(screen.getByText(t.noMatches("galletitas"))).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: t.tryOff }));
    expect(onSearchOff).toHaveBeenCalled();
  });

  it("explains an empty favorites filter without suggesting a catalog search", () => {
    renderResults({ foods: [], query: "galletitas", filter: "favorites" });

    expect(screen.getByText(t.noFavorites)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t.tryOff })).not.toBeInTheDocument();
  });

  it("explains an empty created-by-me filter without suggesting a catalog search", () => {
    renderResults({ foods: [], query: "", filter: "custom" });

    expect(screen.getByText(t.noCustom)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t.tryOff })).not.toBeInTheDocument();
  });

  it("still suggests Open Food Facts when only that source is shown", () => {
    renderResults({ foods: [], query: "galletitas", filter: "off" });

    expect(screen.getByText(t.noMatches("galletitas"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.tryOff })).toBeInTheDocument();
  });
});
