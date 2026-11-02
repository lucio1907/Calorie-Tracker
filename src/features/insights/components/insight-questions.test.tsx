import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { InsightAnswer } from "../lib/insight-questions";
import { insightsStrings as t } from "../strings";
import { InsightQuestions } from "./insight-questions";

const q = t.questions;
const answer: InsightAnswer = {
  question: "protein",
  answer: "Te faltan 30 g de proteína por día.",
  tips: ["Sumá un yogur en la merienda.", "Agregá huevo al desayuno."],
  model: "test-model",
  generatedOn: "2026-10-19",
  rangeDays: 7,
};

function renderQuestions(props: Partial<Parameters<typeof InsightQuestions>[0]> = {}) {
  const onAsk = vi.fn();
  render(<InsightQuestions answers={{}} pending={null} errors={{}} onAsk={onAsk} {...props} />);
  return onAsk;
}

describe("InsightQuestions", () => {
  it("offers the four questions as buttons, in order", () => {
    renderQuestions();

    const section = screen.getByRole("region", { name: q.heading });
    expect(within(section).getAllByRole("button").map((button) => button.textContent)).toEqual([
      q.labels.weight,
      q.labels.protein,
      q.labels.weekend,
      q.labels.consistency,
    ]);
    expect(within(section).getByText(q.description)).toBeInTheDocument();
  });

  it("asks the clicked question", async () => {
    const onAsk = renderQuestions();

    await userEvent.click(screen.getByRole("button", { name: q.labels.weekend }));
    expect(onAsk).toHaveBeenCalledWith("weekend");
  });

  it("shows an answer with its tips in place of its button", () => {
    renderQuestions({ answers: { protein: answer } });

    expect(screen.queryByRole("button", { name: q.labels.protein })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: q.labels.protein, level: 3 })).toBeInTheDocument();
    expect(screen.getByText(answer.answer)).toBeInTheDocument();
    const tips = screen.getByRole("list", { name: q.tips });
    expect(within(tips).getAllByRole("listitem").map((item) => item.textContent)).toEqual(answer.tips);
    expect(screen.getByText(q.note)).toBeInTheDocument();
  });

  it("leaves the tips out when there are none", () => {
    renderQuestions({ answers: { protein: { ...answer, tips: [] } } });
    expect(screen.queryByRole("list", { name: q.tips })).not.toBeInTheDocument();
  });

  it("shows the pending question and disables every question while one is answered", () => {
    renderQuestions({ pending: "weight" });

    expect(screen.getByRole("status")).toHaveTextContent(q.pending);
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });

  it("shows a question's error as an alert and keeps its button", () => {
    renderQuestions({ errors: { weight: t.errors.dailyLimit } });

    expect(screen.getByRole("alert")).toHaveTextContent(t.errors.dailyLimit);
    expect(screen.getByRole("button", { name: q.labels.weight })).toBeEnabled();
  });
});
