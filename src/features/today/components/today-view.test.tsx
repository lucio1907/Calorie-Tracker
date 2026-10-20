import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TodaySummary } from "../lib/today-summary";
import { todayStrings as t } from "../strings";
import { TodayView } from "./today-view";

const ready: TodaySummary = {
  status: "ready",
  bmrKcal: 1780,
  tdeeKcal: 2759,
  goal: "maintain",
  goalKgPerWeek: 0,
  goalAdjustmentKcal: 0,
  minimumKcal: 1500,
  floorRaiseKcal: 0,
  targetKcal: 2759,
  consumed: { kcal: 1500.4, protein: 90.25, carbs: 150, fat: 50.5 },
  exerciseKcal: 300.3,
  remainingKcal: 1559,
  macroTargets: { protein: 207, carbs: 276, fat: 92 },
  proteinGPerKg: 1.8,
  proteinCapped: false,
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

  it("says when the target was raised to the safe minimum, and by how much", () => {
    render(
      <TodayView
        dateLabel="Thursday, October 15"
        summary={{ ...ready, goal: "lose", goalKgPerWeek: 1.5, goalAdjustmentKcal: -1650, floorRaiseKcal: 391, targetKcal: 1500 }}
      />,
    );

    const target = screen.getByRole("group", { name: t.targetHeading });
    expect(within(target).getAllByRole("term").map((term) => term.textContent)).toEqual([
      t.targetBreakdown.tdee,
      t.targetBreakdown.lose("1.5"),
      t.targetBreakdown.floor("1500"),
      t.targetBreakdown.target,
    ]);
    // 2759 - 1650 + 391 = 1500.
    expect(within(target).getByText(t.targetBreakdown.floor("1500")).nextSibling).toHaveTextContent("391");
    expect(within(target).getByText(t.targetBreakdown.target).nextSibling).toHaveTextContent("1500");
  });

  it("shows no safe-minimum line when the target is above it", () => {
    render(<TodayView dateLabel="Thursday, October 15" summary={ready} />);

    expect(screen.queryByText(t.targetBreakdown.floor("1500"))).not.toBeInTheDocument();
  });

  it("warns, without blocking, when the target is below BMR", () => {
    render(
      <TodayView
        dateLabel="Thursday, October 15"
        summary={{ ...ready, goal: "lose", goalKgPerWeek: 0.5, goalAdjustmentKcal: -550, targetKcal: 1586 }}
      />,
    );

    expect(screen.getByText(t.belowBmrWarning("1780"))).toBeInTheDocument();
    expect(screen.getByRole("region", { name: t.remainingLabel })).toBeInTheDocument();
  });

  it("does not warn when the target is at or above BMR", () => {
    render(<TodayView dateLabel="Thursday, October 15" summary={{ ...ready, targetKcal: 1780 }} />);

    expect(screen.queryByText(t.belowBmrWarning("1780"))).not.toBeInTheDocument();
  });

  it("shows macro totals against their targets", () => {
    render(<TodayView dateLabel="Thursday, October 15" summary={ready} />);

    const macros = screen.getByRole("region", { name: t.macrosHeading });
    expect(within(macros).getByText(t.macros.protein).nextSibling).toHaveTextContent("90.3 / 207 g");
    expect(within(macros).getByText(t.macros.carbs).nextSibling).toHaveTextContent("150 / 276 g");
    expect(within(macros).getByText(t.macros.fat).nextSibling).toHaveTextContent("50.5 / 92 g");
    expect(screen.queryByText(t.proteinCappedWarning("1.8"))).not.toBeInTheDocument();
  });

  it("warns when the protein setting takes the whole target", () => {
    render(
      <TodayView
        dateLabel="Thursday, October 15"
        summary={{ ...ready, targetKcal: 1200, macroTargets: { protein: 300, carbs: 0, fat: 0 }, proteinGPerKg: 3, proteinCapped: true }}
      />,
    );

    const macros = screen.getByRole("region", { name: t.macrosHeading });
    expect(within(macros).getByText(t.macros.protein).nextSibling).toHaveTextContent("90.3 / 300 g");
    expect(within(macros).getByText(t.proteinCappedWarning("3"))).toBeInTheDocument();
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
    expect(screen.getByText(t.missing([t.missingFields.birthDate, t.missingFields.weight]))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.setupAction })).toHaveAttribute("href", "/settings");
    expect(screen.queryByRole("region", { name: t.remainingLabel })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.logFood })).toHaveAttribute("href", "/diary");
  });

  it("says the user is too young for a target and links to the birth date in settings", () => {
    render(<TodayView dateLabel="Thursday, October 15" summary={{ status: "underage", minAgeYears: 18 }} />);

    expect(
      screen.getByText("You must be 18 or older to get a calorie target. Update your birth date in Settings."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.underageAction })).toHaveAttribute("href", "/settings");
    expect(screen.queryByText(t.setupMessage)).not.toBeInTheDocument();
    expect(screen.queryByText(/Missing:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: t.remainingLabel })).not.toBeInTheDocument();
  });

  it("fills the budget and macro bars to their share of the target", () => {
    const { container } = render(<TodayView dateLabel="Thursday, October 15" summary={ready} />);

    const fills = [...container.querySelectorAll("[data-progress]")].map((fill) => Number(fill.getAttribute("data-progress")));
    // Food 1500.4 of target 2759 + exercise 300.3; then protein 90.25/207, carbs 150/276, fat 50.5/92.
    expect(fills.map((value) => value.toFixed(3))).toEqual(["0.490", "0.436", "0.543", "0.549"]);
  });

  it("shows a full warning-colored budget bar when over", () => {
    const { container } = render(
      <TodayView
        dateLabel="Thursday, October 15"
        summary={{ ...ready, consumed: { ...ready.consumed, kcal: 3500 }, remainingKcal: -441 }}
      />,
    );

    const budget = container.querySelector("[data-progress]");
    expect(budget).toHaveAttribute("data-progress", "1");
    expect(budget).toHaveClass("bg-over");
  });
});
