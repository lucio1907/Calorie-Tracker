import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCalorieHistory } from "@/features/progress/lib/calorie-history";
import { buildWeightTrend } from "@/features/progress/lib/weight-trend";
import { insightsStrings } from "../strings";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

const getCurrentUser = vi.fn();
vi.mock("@/features/auth/data/current-user", () => ({ getCurrentUser: () => getCurrentUser() }));

const getStoredInsight = vi.fn();
const takeInsightSlot = vi.fn();
const saveInsight = vi.fn();
vi.mock("../data/insights", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../data/insights")>()),
  getStoredInsight: (...args: unknown[]) => getStoredInsight(...args),
  takeInsightSlot: () => takeInsightSlot(),
  saveInsight: (...args: unknown[]) => saveInsight(...args),
}));

const loadProgressData = vi.fn();
vi.mock("@/features/progress/data/load-progress", () => ({
  loadProgressData: (...args: unknown[]) => loadProgressData(...args),
}));

const getDailyMacroTotals = vi.fn();
vi.mock("@/features/progress/data/progress", () => ({
  getDailyMacroTotals: (...args: unknown[]) => getDailyMacroTotals(...args),
}));

const requestInsightCompletion = vi.fn();
vi.mock("../data/openrouter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../data/openrouter")>()),
  requestInsightCompletion: (...args: unknown[]) => requestInsightCompletion(...args),
}));

const { generateInsight } = await import("./insight-actions");
const { InsightLimitError } = await import("../data/insights");
const { InsightRateLimitedError, InsightUnavailableError } = await import("../data/openrouter");

const t = insightsStrings.errors;
const TODAY = "2026-10-19";
const FROM = "2026-10-13";
const MODEL = "nvidia/nemotron-3.5-lightning:free";
const content = { overview: "Venís bien: registraste 1 de 7 días.", wins: ["Comiste 1800 kcal."], improvements: [] };
const stored = { ...content, model: MODEL, generatedOn: TODAY, rangeDays: 7 };

function progress(foodKcal: number) {
  const totals = foodKcal > 0 ? [{ date: "2026-10-15", foodKcal, exerciseKcal: 0 }] : [];
  return {
    from: FROM,
    to: TODAY,
    weights: [],
    profiles: [],
    trend: buildWeightTrend([], FROM, TODAY),
    log: [],
    latestKg: null,
    history: buildCalorieHistory({ from: FROM, to: TODAY, totals, profiles: [], weights: [] }),
  };
}

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  // 12:00 in Buenos Aires.
  vi.setSystemTime(new Date("2026-10-19T15:00:00Z"));
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  vi.restoreAllMocks();
  for (const mock of [getStoredInsight, takeInsightSlot, saveInsight, loadProgressData, getDailyMacroTotals, requestInsightCompletion]) {
    mock.mockReset();
  }
  getCurrentUser.mockReset().mockResolvedValue({ id: "user-a", email: "a@example.com" });
  getStoredInsight.mockResolvedValue(null);
  takeInsightSlot.mockResolvedValue(undefined);
  loadProgressData.mockResolvedValue(progress(1800));
  getDailyMacroTotals.mockResolvedValue([{ date: "2026-10-15", protein: 90, carbs: 200, fat: 60 }]);
  requestInsightCompletion.mockResolvedValue({ content: { ...content, extra: "dropped" }, model: MODEL });
  saveInsight.mockImplementation(async (_userId: string, input: { content: object; model: string; day: string; rangeDays: number }) => ({
    ...input.content,
    model: input.model,
    generatedOn: input.day,
    rangeDays: input.rangeDays,
  }));
});

describe("generateInsight", () => {
  it("rejects a signed-out caller", async () => {
    getCurrentUser.mockResolvedValue(null);

    await expect(generateInsight(7)).resolves.toEqual({ ok: false, error: t.unauthorized });
    expect(takeInsightSlot).not.toHaveBeenCalled();
  });

  it.each([0, 14, Number.NaN, "7"])("rejects the range %s", async (range) => {
    await expect(generateInsight(range as number)).resolves.toEqual({ ok: false, error: t.invalidRange });
    expect(getStoredInsight).not.toHaveBeenCalled();
  });

  it("returns today's stored summary without taking a slot or calling the model", async () => {
    getStoredInsight.mockResolvedValue(stored);

    await expect(generateInsight(7)).resolves.toEqual({ ok: true, data: stored });
    expect(getStoredInsight).toHaveBeenCalledWith("user-a", 7, TODAY);
    expect(takeInsightSlot).not.toHaveBeenCalled();
    expect(requestInsightCompletion).not.toHaveBeenCalled();
  });

  it("asks to log food first when the range has no logged day, without a slot or a model call", async () => {
    loadProgressData.mockResolvedValue(progress(0));

    await expect(generateInsight(7)).resolves.toEqual({ ok: false, error: t.notEnoughData });
    expect(takeInsightSlot).not.toHaveBeenCalled();
    expect(requestInsightCompletion).not.toHaveBeenCalled();
  });

  it("generates, stores and returns a summary from the range's anonymous numbers", async () => {
    const result = await generateInsight(7);

    expect(result).toEqual({ ok: true, data: stored });
    expect(loadProgressData).toHaveBeenCalledWith("user-a", 7, TODAY);
    expect(getDailyMacroTotals).toHaveBeenCalledWith(FROM, TODAY);
    expect(takeInsightSlot).toHaveBeenCalledTimes(1);
    expect(saveInsight).toHaveBeenCalledWith("user-a", { rangeDays: 7, day: TODAY, content, model: MODEL });

    const [{ system, user }] = requestInsightCompletion.mock.calls[0] as [{ system: string; user: string }];
    expect(system).toContain('"overview"');
    expect(JSON.parse(user)).toMatchObject({ rangeDays: 7, loggedDays: 1 });
    expect(user).not.toContain("a@example.com");
    expect(user).not.toContain("user-a");
  });

  it("reports the daily limit without calling the model", async () => {
    takeInsightSlot.mockRejectedValue(new InsightLimitError());

    await expect(generateInsight(7)).resolves.toEqual({ ok: false, error: t.dailyLimit });
    expect(requestInsightCompletion).not.toHaveBeenCalled();
  });

  it("reports a busy service when OpenRouter rate-limits", async () => {
    requestInsightCompletion.mockRejectedValue(new InsightRateLimitedError("429"));
    await expect(generateInsight(7)).resolves.toEqual({ ok: false, error: t.busy });
  });

  it("reports an unavailable service when OpenRouter fails", async () => {
    requestInsightCompletion.mockRejectedValue(new InsightUnavailableError("502"));
    await expect(generateInsight(7)).resolves.toEqual({ ok: false, error: t.unavailable });
  });

  it("treats an answer that fails the schema as unavailable and stores nothing", async () => {
    requestInsightCompletion.mockResolvedValue({ content: { overview: "", wins: "no" }, model: MODEL });

    await expect(generateInsight(7)).resolves.toEqual({ ok: false, error: t.unavailable });
    expect(saveInsight).not.toHaveBeenCalled();
  });

  it("logs unexpected errors without the prompt or content and shows a generic message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    saveInsight.mockRejectedValue(new Error("insert failed"));

    await expect(generateInsight(7)).resolves.toEqual({ ok: false, error: t.unexpected });
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0][0])).toMatch(/^\[insights\]/);
    expect(JSON.stringify(log.mock.calls)).not.toContain(content.overview);
  });
});
