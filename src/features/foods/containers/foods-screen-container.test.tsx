import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FoodSummary } from "../lib/types";
import { foodsStrings } from "../strings";
import { FoodsScreenContainer } from "./foods-screen-container";

vi.mock("../actions/off-actions", () => ({ lookupBarcode: vi.fn(), importOffProduct: vi.fn() }));
vi.mock("../actions/food-actions", () => ({
  createFood: vi.fn(),
  updateFood: vi.fn(),
  deleteFood: vi.fn(),
  setFavorite: vi.fn(),
}));
vi.mock("../actions/portion-actions", () => ({}));

const t = foodsStrings.search;

function food(id: number): FoodSummary {
  return {
    id,
    name: `Alimento ${id}`,
    brand: null,
    source: "argenfoods",
    group: null,
    kcal: 100,
    protein: 1,
    carbs: 2,
    fat: 3,
    isOwn: false,
    isFavorite: false,
  };
}

function foods(from: number, to: number): FoodSummary[] {
  return Array.from({ length: to - from + 1 }, (_, index) => food(from + index));
}

const fetchMock = vi.fn<typeof fetch>();

function requestedUrls(): string[] {
  return fetchMock.mock.calls.map(([input]) => String(input));
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  // Every page answers with one food and a following page.
  fetchMock.mockImplementation(async (input) => {
    const page = Number(new URL(String(input), "http://localhost").searchParams.get("page"));
    return new Response(JSON.stringify({ foods: [food(1000 + page)], hasNextPage: true }), { status: 200 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function renderScreen() {
  render(<FoodsScreenContainer initialFoods={foods(1, 20)} initialHasNextPage />);
  return screen.getByRole("navigation", { name: t.pagination });
}

async function goToPage2(pagination: HTMLElement) {
  await userEvent.click(within(pagination).getByRole("button", { name: t.nextPage }));
  await waitFor(() => expect(pagination).toHaveTextContent(t.page(2)));
  expect(requestedUrls()).toEqual(["/api/foods/search?q=&page=2"]);
  expect(screen.getByRole("button", { name: /Alimento 1002/ })).toBeInTheDocument();
}

describe("FoodsScreenContainer paging", () => {
  it("shows the server-rendered first page of 20 foods", () => {
    const pagination = renderScreen();

    const results = screen.getByRole("region", { name: t.resultsHeading });
    expect(within(results).getAllByRole("button", { name: /Alimento/ })).toHaveLength(20);
    expect(pagination).toHaveTextContent(t.page(1));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("goes back to page 1 when the search changes", async () => {
    const pagination = renderScreen();
    await goToPage2(pagination);

    await userEvent.type(screen.getByLabelText(t.label), "pan");

    await waitFor(() => expect(requestedUrls().at(-1)).toBe("/api/foods/search?q=pan&page=1"));
    await waitFor(() => expect(pagination).toHaveTextContent(t.page(1)));
  });

  it("goes back to page 1 when the favorites filter changes", async () => {
    const pagination = renderScreen();
    await goToPage2(pagination);

    await userEvent.click(screen.getByRole("button", { name: t.favoritesOnly }));

    await waitFor(() => expect(requestedUrls().at(-1)).toBe("/api/foods/search?q=&favorites=1&page=1"));
    await waitFor(() => expect(pagination).toHaveTextContent(t.page(1)));
  });
});
