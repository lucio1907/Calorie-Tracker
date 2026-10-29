import "server-only";

/**
 * OpenRouter API key. Server-only: it is read from the plain (never
 * NEXT_PUBLIC_) variable, so Next.js never inlines it into the browser bundle.
 */
export function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();

  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not set. Add it to .env.local (see .env.example) to generate insights.");
  }

  return key;
}
