import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { INSIGHT_MODELS, InsightRateLimitedError, InsightUnavailableError, requestInsightCompletion } = await import(
  "./openrouter"
);

const fetchMock = vi.fn<typeof fetch>();
const PROMPT = { system: "You are a coach.", user: "Average 1800 kcal." };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** A chat completion envelope whose first choice carries `content`. */
function completion(content: unknown, model: string | undefined = INSIGHT_MODELS[0]): Response {
  return json({ id: "gen-1", model, choices: [{ message: { role: "assistant", content } }] });
}

function requestOf(call: number): { url: string; init: RequestInit; body: Record<string, unknown> } {
  const [input, init = {}] = fetchMock.mock.calls[call];
  return { url: String(input), init, body: JSON.parse(String(init.body)) as Record<string, unknown> };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("requestInsightCompletion", () => {
  it("posts a JSON-mode chat completion with model fallbacks, the key and a timeout", async () => {
    fetchMock.mockResolvedValue(completion('{"overview":"ok"}'));

    await requestInsightCompletion(PROMPT);

    const { url, init, body } = requestOf(0);
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer sk-or-test");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-OpenRouter-Title")).toBe("contador-calorias");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.redirect).toBe("error");
    expect(init.cache).toBe("no-store");

    expect(body.models).toEqual(["google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3.5-super-vl:free"]);
    expect(body.messages).toEqual([
      { role: "system", content: PROMPT.system },
      { role: "user", content: PROMPT.user },
    ]);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.provider).toEqual({ require_parameters: true });
    expect(body.reasoning).toEqual({ effort: "none" });
    expect(body.temperature).toBeTypeOf("number");
    expect(body.max_tokens).toBeTypeOf("number");
  });

  it("only routes to free models", () => {
    expect(INSIGHT_MODELS.every((model) => model.endsWith(":free"))).toBe(true);
  });

  it("returns the parsed content object and the model that answered", async () => {
    fetchMock.mockResolvedValue(completion('{"overview":"ok","wins":[]}', INSIGHT_MODELS[1]));

    await expect(requestInsightCompletion(PROMPT)).resolves.toEqual({
      content: { overview: "ok", wins: [] },
      model: INSIGHT_MODELS[1],
    });
  });

  it("falls back to the primary model id when the response has no model", async () => {
    fetchMock.mockResolvedValue(completion('{"overview":"ok"}', undefined));
    await expect(requestInsightCompletion(PROMPT)).resolves.toMatchObject({ model: INSIGHT_MODELS[0] });
  });

  it.each([
    ["a json fence", '```json\n{"overview":"ok"}\n```'],
    ["a bare fence", '```\n{"overview":"ok"}\n```'],
    ["surrounding whitespace", '  \n{"overview":"ok"}\n '],
  ])("accepts content wrapped in %s", async (_label, content) => {
    fetchMock.mockResolvedValue(completion(content));
    await expect(requestInsightCompletion(PROMPT)).resolves.toMatchObject({ content: { overview: "ok" } });
  });

  it("throws InsightRateLimitedError on 429", async () => {
    fetchMock.mockResolvedValue(json({ error: { code: 429, message: "Rate limit exceeded" } }, 429));
    await expect(requestInsightCompletion(PROMPT)).rejects.toBeInstanceOf(InsightRateLimitedError);
  });

  it.each([
    ["a network error", () => Promise.reject(new TypeError("fetch failed"))],
    ["a timeout", () => Promise.reject(new DOMException("timed out", "TimeoutError"))],
    ["a server error", () => Promise.resolve(json({}, 500))],
    ["an unavailable upstream", () => Promise.resolve(json({}, 503))],
    ["an invalid JSON envelope", () => Promise.resolve(new Response("<html>", { status: 200 }))],
    ["no choices", () => Promise.resolve(json({ model: INSIGHT_MODELS[0], choices: [] }))],
    ["empty content", () => Promise.resolve(completion(""))],
    ["null content", () => Promise.resolve(completion(null))],
    ["content that is not JSON", () => Promise.resolve(completion("Here is your summary: great job"))],
    ["content that is a JSON array", () => Promise.resolve(completion('[{"overview":"ok"}]'))],
    ["content that is a JSON string", () => Promise.resolve(completion('"ok"'))],
  ])("throws InsightUnavailableError on %s", async (_label, respond) => {
    fetchMock.mockImplementation(respond);
    await expect(requestInsightCompletion(PROMPT)).rejects.toBeInstanceOf(InsightUnavailableError);
  });

  it("cancels and rejects a response body over the cap", async () => {
    const state = { cancelled: false };
    const block = new Uint8Array(64 * 1024).fill(0x20);
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(block);
      },
      cancel() {
        state.cancelled = true;
      },
    });
    fetchMock.mockResolvedValue(new Response(body, { status: 200 }));

    await expect(requestInsightCompletion(PROMPT)).rejects.toBeInstanceOf(InsightUnavailableError);
    expect(state.cancelled).toBe(true);
  });

  it("does not call OpenRouter when the key is missing", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    await expect(requestInsightCompletion(PROMPT)).rejects.toThrow(/OPENROUTER_API_KEY is not set/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
