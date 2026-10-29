import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TodaySummary } from "@/features/today/lib/today-summary";
import { diaryStrings } from "../strings";
import { DayTarget } from "./day-target";

const t = diaryStrings.target;

function ready(consumedKcal: number, exerciseKcal: number, remainingKcal: number): TodaySummary {
  return {
    status: "ready",
    bmrKcal: 1780,
    tdeeKcal: 2759,
    goal: "lose",
    goalKgPerWeek: 0.5,
    goalAdjustmentKcal: -550,
    minimumKcal: 1500,
    floorRaiseKcal: 0,
    targetKcal: 2209,
    consumed: { kcal: consumedKcal, protein: 0, carbs: 0, fat: 0 },
    exerciseKcal,
    remainingKcal,
    macroTargets: { protein: 144, carbs: 245, fat: 73 },
    proteinGPerKg: 1.8,
    proteinCapped: false,
  };
}

describe("DayTarget", () => {
  it("shows what is left of the day's target, with eaten, target and exercise", () => {
    render(<DayTarget summary={ready(1500, 350, 1059)} />);

    const card = screen.getByRole("region", { name: t.heading });
    expect(card).toHaveTextContent(t.remaining);
    expect(card).toHaveTextContent("1059");
    expect(card).toHaveTextContent(t.eaten("1500", "2209"));
    expect(card).toHaveTextContent(t.exercise("350"));
  });

  it("says how far over the target the day went", () => {
    render(<DayTarget summary={ready(2500, 0, -291)} />);

    const card = screen.getByRole("region", { name: t.heading });
    expect(card).toHaveTextContent(t.over);
    expect(card).toHaveTextContent("291");
    expect(card).not.toHaveTextContent(t.exercise("0"));
  });

  it("points to Settings while the profile cannot give a target", () => {
    render(<DayTarget summary={{ status: "incomplete", missing: ["weight"] }} />);

    expect(screen.getByText(t.incomplete)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.completeProfile })).toHaveAttribute("href", "/settings");
  });
});
