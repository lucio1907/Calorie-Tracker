import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Insight } from "../lib/insight-schema";
import { insightsStrings as t } from "../strings";
import { InsightCardContainer } from "./insight-card-container";

const generateInsight = vi.fn();
vi.mock("../actions/insight-actions", () => ({ generateInsight: (range: number) => generateInsight(range) }));

const insight: Insight = {
  overview: "Venís bien: registraste 5 de 7 días.",
  wins: ["Promediaste 1850 kcal netas."],
  improvements: ["Sumá 20 g de proteína por día."],
  model: "nvidia/nemotron-3.5-lightning:free",
  generatedOn: "2026-10-19",
  rangeDays: 7,
};

beforeEach(() => {
  generateInsight.mockReset();
});

describe("InsightCardContainer", () => {
  it("replaces the button with the generated summary", async () => {
    generateInsight.mockResolvedValue({ ok: true, data: insight });
    render(<InsightCardContainer range={7} initialInsight={null} />);

    await userEvent.click(screen.getByRole("button", { name: t.generate }));

    expect(await screen.findByText(insight.overview)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t.generate })).not.toBeInTheDocument();
    expect(generateInsight).toHaveBeenCalledWith(7);
  });

  it("shows the error and keeps the button when generation fails", async () => {
    generateInsight.mockResolvedValue({ ok: false, error: t.errors.busy });
    render(<InsightCardContainer range={30} initialInsight={null} />);

    await userEvent.click(screen.getByRole("button", { name: t.generate }));

    expect(await screen.findByRole("alert")).toHaveTextContent(t.errors.busy);
    expect(screen.getByRole("button", { name: t.generate })).toBeEnabled();
  });

  it("shows the stored summary without calling the action", () => {
    render(<InsightCardContainer range={7} initialInsight={insight} />);

    expect(screen.getByText(insight.overview)).toBeInTheDocument();
    expect(generateInsight).not.toHaveBeenCalled();
  });
});
