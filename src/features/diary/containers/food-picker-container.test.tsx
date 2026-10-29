import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FoodSummary } from "@/features/foods/lib/types";
import { foodsStrings } from "@/features/foods/strings";
import type { Recipe } from "@/features/recipes/lib/types";
import { diaryStrings } from "../strings";
import { FoodPickerContainer } from "./food-picker-container";

vi.mock("@/features/foods/actions/off-actions", () => ({ lookupBarcode: vi.fn(), importOffProduct: vi.fn() }));

const t = diaryStrings.add;
const s = foodsStrings.search;

const arroz: FoodSummary = {
  id: 1, name: "Arroz", brand: null, source: "argenfoods", group: null,
  kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, isOwn: false, isFavorite: false,
};
const tarta: Recipe = { id: 9, name: "Tarta de verdura", servings: 4, notes: null, items: [] };

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ foods: [] }), { status: 200 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function renderPicker() {
  const handlers = { onPick: vi.fn(), onPickRecipe: vi.fn(), onSearchOff: vi.fn(), onCreateFood: vi.fn() };
  render(<FoodPickerContainer recentFoods={[arroz]} initialFoods={[arroz]} recipes={[tarta]} {...handlers} />);
  return handlers;
}

describe("FoodPickerContainer", () => {
  it("leads with the search, then the other ways to add, then recents, recipes and results", () => {
    renderPicker();

    const order = [
      screen.getByLabelText(s.label),
      screen.getByRole("group", { name: s.filterLabel }),
      screen.getByRole("button", { name: t.barcode }),
      screen.getByRole("button", { name: t.newFood }),
      screen.getByRole("region", { name: t.recentHeading }),
      screen.getByRole("region", { name: t.recipesHeading }),
      screen.getByRole("region", { name: s.resultsHeading }),
    ];
    for (let index = 1; index < order.length; index++) {
      expect(order[index - 1].compareDocumentPosition(order[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("keeps the barcode lookup folded until asked for", async () => {
    renderPicker();
    const toggle = screen.getByRole("button", { name: t.barcode });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText(foodsStrings.barcode.label)).not.toBeInTheDocument();

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText(foodsStrings.barcode.label)).toBeInTheDocument();
  });

  it("shows recipes with the user's own foods but not with favorites or a shared source", async () => {
    renderPicker();
    const chips = screen.getByRole("group", { name: s.filterLabel });

    await userEvent.click(within(chips).getByRole("button", { name: s.filters.custom }));
    expect(screen.getByRole("region", { name: t.recipesHeading })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: t.recentHeading })).not.toBeInTheDocument();

    await userEvent.click(within(chips).getByRole("button", { name: s.filters.favorites }));
    expect(screen.queryByRole("region", { name: t.recipesHeading })).not.toBeInTheDocument();

    await userEvent.click(within(chips).getByRole("button", { name: s.filters.argenfoods }));
    expect(screen.queryByRole("region", { name: t.recipesHeading })).not.toBeInTheDocument();
  });

  it("opens the new food form", async () => {
    const { onCreateFood } = renderPicker();

    await userEvent.click(screen.getByRole("button", { name: t.newFood }));

    expect(onCreateFood).toHaveBeenCalled();
  });
});
