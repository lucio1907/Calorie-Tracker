import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TodaySummary } from "../lib/today-summary";
import { todayStrings as t } from "../strings";
import { TodayView } from "./today-view";

const ready: TodaySummary = {
  status: "ready",
  tdeeKcal: 2759,
  goal: "maintain",
  goalKgPerWeek: 0,
  goalAdjustmentKcal: 0,
  targetKcal: 2759,
  consumed: { kcal: 1500.4, protein: 90.25, carbs: 150, fat: 50.5 },
  exerciseKcal: 300.3,
  remainingKcal: 1559,
  macroTargets: { protein: 207, carbs: 276, fat: 92 },
};

describe("TodayView", () => {
  it("shows target, exercise, consumed and remaining kcal", () => {
    render(<TodayView dateLabel="Thursday, October 15" summary={ready} />);

    const balance = screen.getByRole("region", { name: t.remainingLabel });
    expect(within(balance).getByText(t.equation.target).nextSibling).toHaveTextContent("2759");
    expect(within(balance).getByText(t.equation.exercise).nextSibling).toHaveTextContent("300");
    expect(within(balance).getByText(t.equation.food).nextSibling).toHaveTextContent("1500");
    expect(within(balance).getByText(t.equation.remaining).nextSibling).toHaveTextContent("1559");
  });

  it("shows how the target comes from TDEE and the weight goal", () => {
    render(
      <TodayView
        dateLabel="Thursday, October 15"
        summary={{ ...ready, goal: "lose", goalKgPerWeek: 0.25, goalAdjustmentKcal: -275, targetKcal: 2484 }}
      />,
    );

    const target = screen.getByRole("group", { name: t.targetHeading });
    expect(within(target).getByText(t.targetBreakdown.tdee).nextSibling).toHaveTextContent("2759");
    expect(within(target).getByText(t.targetBreakdown.lose("0.25")).nextSibling).toHaveTextContent("275");
    expect(within(target).getByText(t.targetBreakdown.target).nextSibling).toHaveTextContent("2484");
  });

  it("shows a weight-gain surplus as an addition", () => {
    render(
      <TodayView
        dateLabel="Thursday, October 15"
        summary={{ ...ready, goal: "gain", goalKgPerWeek: 0.5, goalAdjustmentKcal: 550, targetKcal: 3309 }}
      />,
    );

    const target = screen.getByRole("group", { name: t.targetHeading });
    expect(within(target).getByText(t.targetBreakdown.gain("0.5")).nextSibling).toHaveTextContent("550");
  });

  it("shows no goal adjustment while maintaining", () => {
    render(<TodayView dateLabel="Thursday, October 15" summary={ready} />);

    const target = screen.getByRole("group", { name: t.targetHeading });
    expect(within(target).getAllByRole("term").map((term) => term.textContent)).toEqual([
      t.targetBreakdown.tdee,
      t.targetBreakdown.target,
    ]);
  });

  it("shows macro totals against their targets", () => {
    render(<TodayView dateLabel="Thursday, October 15" summary={ready} />);

    const macros = screen.getByRole("region", { name: t.macrosHeading });
    expect(within(macros).getByText(t.macros.protein).nextSibling).toHaveTextContent("90.3 / 207 g");
    expect(within(macros).getByText(t.macros.carbs).nextSibling).toHaveTextContent("150 / 276 g");
    expect(within(macros).getByText(t.macros.fat).nextSibling).toHaveTextContent("50.5 / 92 g");
  });

  it("says how far over target the day is", () => {
    render(<TodayView dateLabel="Thursday, October 15" summary={{ ...ready, remainingKcal: -241 }} />);

    const balance = screen.getByRole("region", { name: t.overLabel });
    expect(within(balance).getByText("241", { selector: "span" })).toBeInTheDocument();
  });

  it("links to the diary for logging", () => {
    render(<TodayView dateLabel="Thursday, October 15" summary={ready} />);

    expect(screen.getByRole("link", { name: t.logFood })).toHaveAttribute("href", "/diary");
    expect(screen.getByText("Thursday, October 15")).toBeInTheDocument();
  });

  it("points to settings, not the balance, when the profile is incomplete", () => {
    render(
      <TodayView dateLabel="Thursday, October 15" summary={{ status: "incomplete", missing: ["birthDate", "weight"] }} />,
    );

    expect(screen.getByText(t.setupMessage)).toBeInTheDocument();
    expect(screen.getByText(t.missing(["birth date", "weight"]))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.setupAction })).toHaveAttribute("href", "/settings");
    expect(screen.queryByRole("region", { name: t.remainingLabel })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.logFood })).toHaveAttribute("href", "/diary");
  });
});
