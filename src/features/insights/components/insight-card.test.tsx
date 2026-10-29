import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Insight } from "../lib/insight-schema";
import { insightsStrings as t } from "../strings";
import { InsightCard } from "./insight-card";

const insight: Insight = {
  overview: "Venís bien: registraste 5 de 7 días.",
  wins: ["Promediaste 1850 kcal netas.", "Entrenaste 3 veces."],
  improvements: ["Sumá 20 g de proteína por día."],
  model: "nvidia/nemotron-3.5-lightning:free",
  generatedOn: "2026-10-19",
  rangeDays: 7,
};

describe("InsightCard", () => {
  it("offers the generate button when there is no summary", async () => {
    const onGenerate = vi.fn();
    render(<InsightCard insight={null} pending={false} error={null} onGenerate={onGenerate} />);

    expect(screen.getByRole("heading", { name: t.title, level: 2 })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: t.generate }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it("shows a loading placeholder and disables the button while generating", () => {
    render(<InsightCard insight={null} pending error={null} onGenerate={() => {}} />);

    expect(screen.getByRole("status")).toHaveTextContent(t.pending);
    expect(screen.getByRole("button", { name: t.pending })).toBeDisabled();
  });

  it("shows an error as an alert and keeps the button", () => {
    render(<InsightCard insight={null} pending={false} error={t.errors.dailyLimit} onGenerate={() => {}} />);

    expect(screen.getByRole("alert")).toHaveTextContent(t.errors.dailyLimit);
    expect(screen.getByRole("button", { name: t.generate })).toBeEnabled();
  });

  it("shows the stored summary with its sections and the AI note, without the button", () => {
    render(<InsightCard insight={insight} pending={false} error={null} onGenerate={() => {}} />);

    expect(screen.getByRole("heading", { name: t.overview, level: 3 })).toBeInTheDocument();
    expect(screen.getByText(insight.overview)).toBeInTheDocument();
    const wins = screen.getByRole("list", { name: t.wins });
    expect(within(wins).getAllByRole("listitem")).toHaveLength(2);
    const improvements = screen.getByRole("list", { name: t.improvements });
    expect(within(improvements).getByText(insight.improvements[0])).toBeInTheDocument();
    expect(screen.getByText(t.note("19 oct"))).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("leaves out an empty section", () => {
    render(<InsightCard insight={{ ...insight, wins: [] }} pending={false} error={null} onGenerate={() => {}} />);

    expect(screen.queryByRole("heading", { name: t.wins })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: t.improvements })).toBeInTheDocument();
  });
});
