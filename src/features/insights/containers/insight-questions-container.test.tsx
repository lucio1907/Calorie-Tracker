import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InsightAnswer } from "../lib/insight-questions";
import { insightsStrings as t } from "../strings";
import { InsightQuestionsContainer } from "./insight-questions-container";

const askInsightQuestion = vi.fn();
vi.mock("../actions/insight-actions", () => ({
  askInsightQuestion: (range: number, question: string) => askInsightQuestion(range, question),
}));

const q = t.questions;
const answer: InsightAnswer = {
  question: "weight",
  answer: "Bajaste 0,4 kg y tu balance explica 1,2 kg.",
  tips: ["Pesá las porciones."],
  model: "test-model",
  generatedOn: "2026-10-19",
  rangeDays: 30,
};

beforeEach(() => {
  askInsightQuestion.mockReset();
});

describe("InsightQuestionsContainer", () => {
  it("asks the question for the range and shows the answer", async () => {
    askInsightQuestion.mockResolvedValue({ ok: true, data: answer });
    render(<InsightQuestionsContainer range={30} initialAnswers={[]} />);

    await userEvent.click(screen.getByRole("button", { name: q.labels.weight }));

    expect(await screen.findByText(answer.answer)).toBeInTheDocument();
    expect(askInsightQuestion).toHaveBeenCalledWith(30, "weight");
    expect(screen.queryByRole("button", { name: q.labels.weight })).not.toBeInTheDocument();
  });

  it("shows the error under the question and lets it be asked again", async () => {
    askInsightQuestion.mockResolvedValue({ ok: false, error: t.errors.busy });
    render(<InsightQuestionsContainer range={7} initialAnswers={[]} />);

    await userEvent.click(screen.getByRole("button", { name: q.labels.protein }));

    expect(await screen.findByRole("alert")).toHaveTextContent(t.errors.busy);
    expect(screen.getByRole("button", { name: q.labels.protein })).toBeEnabled();
  });

  it("shows today's stored answers without calling the action", () => {
    render(<InsightQuestionsContainer range={30} initialAnswers={[answer]} />);

    expect(screen.getByText(answer.answer)).toBeInTheDocument();
    expect(askInsightQuestion).not.toHaveBeenCalled();
  });
});
