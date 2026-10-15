import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FoodDetail as FoodDetailData } from "../lib/types";
import { foodsStrings } from "../strings";
import { FoodDetail } from "./food-detail";
import { PortionList } from "./portion-list";

const t = foodsStrings.detail;
const n = foodsStrings.nutrients;

const shared: FoodDetailData = {
  id: 7,
  name: "Trigo, pan francés",
  brand: null,
  source: "argenfoods",
  group: "Cereales y derivados",
  barcode: null,
  externalCode: "36",
  kcal: 269,
  protein: 9.3,
  carbs: 57.4,
  fat: 0.2,
  fiber: null,
  sodiumMg: 274,
  isOwn: false,
  isFavorite: false,
  portions: [{ id: 1, label: "1 pancito", grams: 50 }],
};

function renderDetail(food: FoodDetailData, overrides: Partial<Parameters<typeof FoodDetail>[0]> = {}) {
  const handlers = {
    onToggleFavorite: vi.fn(),
    onEdit: vi.fn(),
    onDeleteRequest: vi.fn(),
    onDeleteConfirm: vi.fn(),
    onDeleteCancel: vi.fn(),
  };
  render(
    <FoodDetail
      food={food}
      deleteState="idle"
      portions={<PortionList portions={food.portions} editable={false} />}
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
}

describe("FoodDetail", () => {
  it("shows nutrients per 100 g, flags values the source did not report and cites the source", () => {
    renderDetail(shared);

    const nutrients = screen.getByRole("region", { name: t.nutrientsHeading });
    expect(within(nutrients).getByText(n.kcal).nextSibling).toHaveTextContent("269kcal");
    expect(within(nutrients).getByText(n.sodium).nextSibling).toHaveTextContent("274mg");
    expect(within(nutrients).getByText(n.fiber).nextSibling).toHaveTextContent(n.notReportedLabel);
    expect(screen.getByText(foodsStrings.sources.argenfoods)).toBeInTheDocument();
    expect(screen.getByText(t.argenfoodsAttribution)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.viewSource })).toHaveAttribute("href", "https://www.argenfood.unlu.edu.ar/");
    expect(screen.getByText("1 pancito")).toBeInTheDocument();
  });

  it("does not offer edit or delete for catalog foods", () => {
    renderDetail(shared);

    expect(screen.queryByRole("button", { name: t.edit })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t.delete })).not.toBeInTheDocument();
  });

  it("toggles favorites with a pressed state", async () => {
    const { onToggleFavorite } = renderDetail({ ...shared, isFavorite: true });

    const button = screen.getByRole("button", { name: t.unfavorite });
    expect(button).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(button);
    expect(onToggleFavorite).toHaveBeenCalled();
  });

  it("lets the owner edit and asks for confirmation before deleting", async () => {
    const own: FoodDetailData = { ...shared, source: "custom", isOwn: true, externalCode: null };
    const { onEdit, onDeleteRequest } = renderDetail(own);

    expect(screen.queryByRole("link", { name: t.viewSource })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: t.edit }));
    await userEvent.click(screen.getByRole("button", { name: t.delete }));
    expect(onEdit).toHaveBeenCalled();
    expect(onDeleteRequest).toHaveBeenCalled();
  });

  it("shows the confirmation step and disables it while deleting", () => {
    const own: FoodDetailData = { ...shared, source: "custom", isOwn: true };
    renderDetail(own, { deleteState: "deleting" });

    const group = screen.getByRole("group", { name: t.delete });
    expect(within(group).getByText(t.confirmDelete(own.name))).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: t.delete })).toBeDisabled();
  });

  it("links Open Food Facts products to their product page", () => {
    renderDetail({ ...shared, source: "off", barcode: "7790580660000", isOwn: true });

    expect(screen.getByRole("link", { name: t.viewSource })).toHaveAttribute(
      "href",
      "https://world.openfoodfacts.org/product/7790580660000",
    );
  });
});
