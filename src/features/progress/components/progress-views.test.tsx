import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CalorieHistory } from "../lib/calorie-history";
import { buildWeightTrend } from "../lib/weight-trend";
import { progressStrings } from "../strings";
import { CalorieHistoryView } from "./calorie-history-view";
import { WeightChart } from "./weight-chart";

const t = progressStrings;

describe("WeightChart", () => {
  it("shows an empty message without entries", () => {
    render(<WeightChart trend={buildWeightTrend([], "2026-10-13", "2026-10-19")} from="2026-10-13" to="2026-10-19" rangeDays={7} />);

    expect(screen.getByText(t.weight.empty)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("summarises the range and labels the chart", () => {
    const trend = buildWeightTrend(
      [
        { id: 1, date: "2026-10-13", kg: 81 },
        { id: 2, date: "2026-10-19", kg: 80.2 },
      ],
      "2026-10-13",
      "2026-10-19",
    );
    render(<WeightChart trend={trend} from="2026-10-13" to="2026-10-19" rangeDays={7} />);

    expect(screen.getByRole("img", { name: t.weight.chartLabel(2, 7, "Oct 13", "Oct 19") })).toBeInTheDocument();
    const latest = screen.getByText(t.weight.latest).closest("div")!;
    expect(within(latest).getByText("80.2 kg")).toBeInTheDocument();
    const change = screen.getByText(t.weight.change).closest("div")!;
    expect(within(change).getByText("-0.8 kg")).toBeInTheDocument();
  });
});

const baseHistory: CalorieHistory = {
  days: [
    { date: "2026-10-18", foodKcal: 2500, exerciseKcal: 200, netKcal: 2300, targetKcal: 2000, balanceKcal: 300, status: "over" },
    { date: "2026-10-19", foodKcal: 0, exerciseKcal: 0, netKcal: 0, targetKcal: 2000, balanceKcal: null, status: "unlogged" },
  ],
  loggedDays: 1,
  hasTarget: true,
  averageNetKcal: 2300,
  averageTargetKcal: 2000,
  averageBalanceKcal: 300,
  underDays: 0,
  overDays: 1,
};

describe("CalorieHistoryView", () => {
  it("lists logged days with their balance and a text status", () => {
    render(<CalorieHistoryView history={baseHistory} />);

    expect(screen.getByRole("img", { name: t.calories.chartLabel(0, 1) })).toBeInTheDocument();
    const days = screen.getByRole("list", { name: t.calories.dayList });
    expect(within(days).getAllByRole("listitem")).toHaveLength(1);
    expect(within(days).getByText("+300 kcal")).toBeInTheDocument();
    expect(within(days).getByText(t.calories.over)).toBeInTheDocument();
  });

  it("asks for a profile when no day has a target", () => {
    render(
      <CalorieHistoryView
        history={{
          ...baseHistory,
          days: baseHistory.days.map((day) => ({ ...day, targetKcal: null, balanceKcal: null, status: "unlogged" })),
          hasTarget: false,
          averageTargetKcal: null,
          averageBalanceKcal: null,
          overDays: 0,
        }}
      />,
    );

    expect(screen.getByText(t.calories.noTarget)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.calories.noTargetAction })).toHaveAttribute("href", "/settings");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows an empty message when nothing was logged", () => {
    render(<CalorieHistoryView history={{ ...baseHistory, loggedDays: 0, averageNetKcal: null }} />);

    expect(screen.getByText(t.calories.empty)).toBeInTheDocument();
  });
});
