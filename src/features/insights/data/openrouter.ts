import "server-only";
import { getOpenRouterApiKey } from "./openrouter-env";

/*
 * OpenRouter chat client for AI insights. Server-side only: the key and the
 * prompts never reach the browser, and neither is logged here.
 *
 * - Endpoint and body fields: https://openrouter.ai/docs/api/reference/overview
 * - `models` is OpenRouter's fallback list, tried in order; the response's
 *   `model` names the one that answered:
 *   https://openrouter.ai/docs/guides/routing/model-fallbacks
 * - No `response_format` (JSON mode): the primary model does not support it,
 *   and `provider.require_parameters` would then skip it. The prompt asks for
 *   a JSON object and the reply is parsed here and validated by the caller.
 * - `reasoning.effort: "none"` disables reasoning entirely:
 *   https://openrouter.ai/docs/use-cases/reasoning-tokens
 */

const COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";
/** App attribution shown on openrouter.ai (`X-OpenRouter-Title`, formerly `X-Title`). */
const APP_TITLE = "contador-calorias";
/**
 * Free models only, primary first. Picked by a benchmark on 2026-10-29
 * (odd/tasks/ai-insights.md, L7): nemotron-3.5-lightning answered 5/5 with
 * valid JSON, ~0.3 s to the first token and ~3.4 s in total; gemma-4-26b-a4b
 * was rate-limited upstream 5/5 at the time, so it is the fallback.
 */
export const INSIGHT_MODELS = ["nvidia/nemotron-3.5-lightning:free", "google/gemma-4-26b-a4b-it:free"] as const;
const TIMEOUT_MS = 20_000;
/** A summary is a few KB; anything this large is not a real answer. */
const MAX_BODY_BYTES = 256 * 1024;
/** Room for the longest answer insight-schema accepts; free models cost nothing per token. */
const MAX_TOKENS = 1200;
const TEMPERATURE = 0.4;

/** OpenRouter did not answer usefully (network error, timeout, 5xx, malformed or non-JSON content). */
export class InsightUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "InsightUnavailableError";
  }
}

/** OpenRouter answered 429: the free-tier quota or the upstream provider's rate limit was hit. */
export class InsightRateLimitedError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "InsightRateLimitedError";
  }
}

/** Sends one JSON-mode chat completion and returns the parsed object plus the model that wrote it. */
export async function requestInsightCompletion({
  system,
  user,
}: {
  system: string;
  user: string;
}): Promise<{ content: Record<string, unknown>; model: string }> {
  const apiKey = getOpenRouterApiKey();

  let response: Response;
  try {
    response = await fetch(COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-OpenRouter-Title": APP_TITLE,
      },
      body: JSON.stringify({
        models: INSIGHT_MODELS,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        reasoning: { effort: "none" },
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
      // OpenRouter's API answers directly; a redirect (to another host, or http) is rejected.
      redirect: "error",
    });
  } catch (error) {
    throw new InsightUnavailableError("OpenRouter request failed", { cause: error });
  }

  if (response.status === 429) {
    await response.body?.cancel();
    throw new InsightRateLimitedError("OpenRouter responded 429");
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new InsightUnavailableError(`OpenRouter responded ${response.status}`);
  }

  let envelope: unknown;
  try {
    envelope = JSON.parse(await readCappedText(response));
  } catch (error) {
    if (error instanceof InsightUnavailableError) throw error;
    throw new InsightUnavailableError("OpenRouter sent invalid JSON", { cause: error });
  }

  return { content: parseContent(messageContent(envelope)), model: answeringModel(envelope) };
}

/** `choices[0].message.content`, which must be a non-empty string from an answer that was not cut off. */
function messageContent(envelope: unknown): string {
  const choices = isObject(envelope) ? envelope.choices : null;
  const first: unknown = Array.isArray(choices) ? choices[0] : null;
  if (isObject(first) && first.finish_reason === "length") {
    throw new InsightUnavailableError("OpenRouter answer was cut off at the token limit");
  }
  const message = isObject(first) ? first.message : null;
  const content = isObject(message) ? message.content : null;
  if (typeof content !== "string" || content.trim() === "") {
    throw new InsightUnavailableError("OpenRouter sent no message content");
  }
  return content;
}

/** Parses the content as a JSON object. Some models wrap JSON mode output in a ```json fence anyway. */
function parseContent(content: string): Record<string, unknown> {
  const unfenced = content.trim().replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/i, "$1");
  let parsed: unknown;
  try {
    parsed = JSON.parse(unfenced);
  } catch (error) {
    throw new InsightUnavailableError("OpenRouter content is not JSON", { cause: error });
  }
  if (!isObject(parsed)) throw new InsightUnavailableError("OpenRouter content is not a JSON object");
  return parsed;
}

/** The model that answered, as OpenRouter reports it; the primary id when absent. */
function answeringModel(envelope: unknown): string {
  const model = isObject(envelope) ? envelope.model : null;
  return typeof model === "string" && model !== "" ? model : INSIGHT_MODELS[0];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads the body as text, at most MAX_BODY_BYTES: past that the stream is
 * cancelled instead of buffering whatever arrives. The request's timeout signal
 * still applies while the body streams in.
 */
async function readCappedText(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new InsightUnavailableError("OpenRouter response too large");
      }
      text += decoder.decode(value, { stream: true });
    }
  } catch (error) {
    if (error instanceof InsightUnavailableError) throw error;
    throw new InsightUnavailableError("OpenRouter request failed", { cause: error });
  }
  return text + decoder.decode();
}
