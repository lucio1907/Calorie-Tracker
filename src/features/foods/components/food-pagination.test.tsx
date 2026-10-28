import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { foodsStrings } from "../strings";
import { FoodPagination } from "./food-pagination";

const t = foodsStrings.search;

function renderPagination(page: number, hasNextPage: boolean) {
  const onPageChange = vi.fn();
  render(<FoodPagination page={page} hasNextPage={hasNextPage} onPageChange={onPageChange} />);
  return onPageChange;
}

describe("FoodPagination", () => {
  it("is not shown when every result fits on the first page", () => {
    renderPagination(1, false);
    expect(screen.queryByRole("navigation", { name: t.pagination })).not.toBeInTheDocument();
  });

  it("on the first page offers only Siguiente", async () => {
    const onPageChange = renderPagination(1, true);

    expect(screen.getByRole("navigation", { name: t.pagination })).toHaveTextContent(t.page(1));
    expect(screen.getByRole("button", { name: t.previousPage })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: t.nextPage }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("in the middle offers both directions", async () => {
    const onPageChange = renderPagination(2, true);

    expect(screen.getByRole("button", { name: t.nextPage })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: t.previousPage }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("on the last page offers only Anterior", () => {
    renderPagination(3, false);

    expect(screen.getByText(t.page(3))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.previousPage })).toBeEnabled();
    expect(screen.getByRole("button", { name: t.nextPage })).toBeDisabled();
  });
});
