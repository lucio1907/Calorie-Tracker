import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Insight } from "../lib/insight-schema";
import type { InsightAnswer } from "../lib/insight-questions";
import type { InsightStats } from "../lib/insight-stats";
import { insightsStrings as t } from "../strings";

vi.mock("server-only", () => ({}));

// 12:00 on 2026-10-19 in Buenos Aires.
vi.mock("@/lib/request-time", () => ({ requestNow: async () => new Date("2026-10-19T15:00:00Z") }));
vi.mock("@/features/auth/data/current-user", () => ({ requireUser: async () => ({ id: "user-a", email: "a@example.com" }) }));
vi.mock("../actions/insight-actions", () => ({ generateInsight: vi.fn(), askInsightQuestion: vi.fn() }));

const getStoredInsightOrNull = vi.fn();
const listInsights = vi.fn();
vi.mock("../data/insights", () => ({
  getStoredInsightOrNull: (...args: unknown[]) => getStoredInsightOrNull(...args),
  listInsights: (...args: unknown[]) => listInsights(...args),
}));

const loadProgressData = vi.fn();
vi.mock("@/features/progress/data/load-progress", () => ({
  loadProgressData: (...args: unknown[]) => loadProgressData(...args),
}));

const loadInsightStats = vi.fn();
vi.mock("../data/insight-stats", () => ({ loadInsightStats: (...args: unknown[]) => loadInsightStats(...args) }));

const listAnswers = vi.fn();
vi.mock("../data/insight-answers", () => ({ listAnswers: (...args: unknown[]) => listAnswers(...args) }));

const { InsightsPage } = await import("./insights-page");

const TODAY = "2026-10-19";
const insight: Insight = {
  overview: "Venís bien: registraste 5 de 7 días.",
  wins: [],
  improvements: [],
  model: "test-model",
  generatedOn: TODAY,
  rangeDays: 7,
};
const older: Insight = { ...insight, overview: "Resumen de la semana pasada.", generatedOn: "2026-10-12" };
const stats: InsightStats = { balanceVsGoal: "a favor de la meta", averageBalanceKcal: -150, macros: [] };
const answer: InsightAnswer = {
  question: "protein",
  answer: "Te faltan 30 g de proteína por día.",
  tips: [],
  model: "test-model",
  generatedOn: TODAY,
  rangeDays: 7,
};
const progress = { from: "2026-10-13", to: TODAY };

async function renderPage(range = "7") {
  render(await InsightsPage({ searchParams: Promise.resolve({ range }) }));
}

let log: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  log = vi.spyOn(console, "error").mockImplementation(() => {});
  getStoredInsightOrNull.mockReset().mockResolvedValue(insight);
  listInsights.mockReset().mockResolvedValue([insight, older]);
  loadProgressData.mockReset().mockResolvedValue(progress);
  loadInsightStats.mockReset().mockResolvedValue(stats);
  listAnswers.mockReset().mockResolvedValue([answer]);
});

afterEach(() => {
  log.mockRestore();
});

describe("InsightsPage", () => {
  it("shows the range's summary with its numbers, today's answers and the older summaries", async () => {
    await renderPage();

    expect(getStoredInsightOrNull).toHaveBeenCalledWith("user-a", 7, TODAY);
    expect(loadProgressData).toHaveBeenCalledWith("user-a", 7, TODAY);
    expect(loadInsightStats).toHaveBeenCalledWith(progress, 7);
    expect(listAnswers).toHaveBeenCalledWith("user-a", 7, TODAY);

    expect(screen.getByText(insight.overview)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: t.stats.heading })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: t.questions.heading })).getByText(answer.answer)).toBeInTheDocument();
    expect(screen.getByText(older.overview)).toBeInTheDocument();
    expect(log).not.toHaveBeenCalled();
  });

  it("still shows the summary and the questions when the history read fails", async () => {
    listInsights.mockRejectedValue(new Error("history down"));
    await renderPage();

    expect(screen.getByText(t.history.failed)).toBeInTheDocument();
    expect(screen.getByText(insight.overview)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: t.questions.heading })).toBeInTheDocument();
    expect(String(log.mock.calls[0][0])).toMatch(/^\[insights\] history read failed/);
  });

  it("shows the summary without its numbers when the progress read fails", async () => {
    loadProgressData.mockRejectedValue(new Error("progress down"));
    await renderPage();

    expect(screen.getByText(insight.overview)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: t.stats.heading })).not.toBeInTheDocument();
    expect(loadInsightStats).not.toHaveBeenCalled();
    expect(String(log.mock.calls[0][0])).toMatch(/^\[insights\] progress read failed/);
  });

  it("offers every question when today's answers cannot be read", async () => {
    listAnswers.mockRejectedValue(new Error("answers down"));
    await renderPage();

    const questions = screen.getByRole("region", { name: t.questions.heading });
    expect(within(questions).getAllByRole("button")).toHaveLength(4);
    expect(screen.getByText(insight.overview)).toBeInTheDocument();
    expect(String(log.mock.calls[0][0])).toMatch(/^\[insights\] answers read failed/);
  });

  it("reads the default 30-day range when the range is missing or invalid", async () => {
    await renderPage("14");

    expect(getStoredInsightOrNull).toHaveBeenCalledWith("user-a", 30, TODAY);
    expect(listAnswers).toHaveBeenCalledWith("user-a", 30, TODAY);
  });
});
