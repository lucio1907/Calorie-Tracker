import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Insight } from "../lib/insight-schema";
import { insightsStrings as t } from "../strings";
import { InsightHistory } from "./insight-history";

const base: Insight = {
  overview: "Venís bien: registraste 5 de 7 días.",
  wins: ["Promediaste 1850 kcal netas."],
  improvements: ["Sumá 20 g de proteína por día."],
  model: "nvidia/nemotron-3.5-lightning:free",
  generatedOn: "2026-10-19",
  rangeDays: 7,
};

describe("InsightHistory", () => {
  it("lists every summary in the given order (newest first) with its date, range, overview and sections", () => {
    const insights: Insight[] = [
      base,
      { ...base, rangeDays: 30, overview: "Un mes parejo.", wins: [] },
      { ...base, generatedOn: "2025-12-31", rangeDays: 90, overview: "Fin de año." },
    ];
    render(<InsightHistory insights={insights} />);

    // Direct children only: each summary's wins and improvements are lists of their own.
    const items = Array.from(screen.getByRole("list", { name: t.history.list }).children) as HTMLElement[];
    expect(items).toHaveLength(3);

    expect(within(items[0]).getByRole("heading", { level: 3 })).toHaveTextContent("19 de octubre de 2026");
    expect(within(items[0]).getByText("7 días")).toBeInTheDocument();
    expect(within(items[0]).getByText(base.overview)).toBeInTheDocument();
    expect(within(items[0]).getByRole("list", { name: t.wins })).toHaveTextContent(base.wins[0]);
    expect(within(items[0]).getByRole("list", { name: t.improvements })).toHaveTextContent(base.improvements[0]);

    expect(within(items[1]).getByText("30 días")).toBeInTheDocument();
    expect(within(items[1]).queryByRole("list", { name: t.wins })).not.toBeInTheDocument();

    expect(within(items[2]).getByRole("heading", { level: 3 })).toHaveTextContent("31 de diciembre de 2025");
    expect(within(items[2]).getByText("90 días")).toBeInTheDocument();
    expect(within(items[2]).getByText("Fin de año.")).toBeInTheDocument();
  });

  it("shows the empty state when nothing was generated yet", () => {
    render(<InsightHistory insights={[]} />);

    expect(screen.getByText(t.history.empty)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: t.history.list })).not.toBeInTheDocument();
  });
});
