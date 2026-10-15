import "server-only";
import { io } from "next/cache";

/**
 * The current instant for request-time rendering.
 *
 * With Cache Components, reading the clock while prerendering is an error
 * (the value would be frozen into the static shell). `await io()` suspends
 * during prerender and resolves immediately during a real request, so the
 * clock is only read per request. Callers must sit inside a <Suspense>.
 * Docs: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md
 */
export async function requestNow(): Promise<Date> {
  await io();
  return new Date();
}
