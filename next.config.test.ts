import { afterEach, describe, expect, it, vi } from "vitest";

/** Loads next.config.ts afresh with the given environment. */
async function loadConfig(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return (await import("./next.config")).default;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("next.config testing API guard", () => {
  it("refuses to expose the testing API in a Vercel production build", async () => {
    await expect(loadConfig({ EXPOSE_TESTING_API: "1", VERCEL_ENV: "production" })).rejects.toThrow(
      /EXPOSE_TESTING_API/,
    );
  });

  it("exposes it for the E2E build, which runs outside Vercel", async () => {
    const config = await loadConfig({ EXPOSE_TESTING_API: "1", VERCEL_ENV: undefined });
    expect(config.experimental?.exposeTestingApiInProductionBuild).toBe(true);
  });

  it("allows it in a preview deployment", async () => {
    const config = await loadConfig({ EXPOSE_TESTING_API: "1", VERCEL_ENV: "preview" });
    expect(config.experimental?.exposeTestingApiInProductionBuild).toBe(true);
  });

  it("leaves it out by default, production included", async () => {
    const config = await loadConfig({ EXPOSE_TESTING_API: undefined, VERCEL_ENV: "production" });
    expect(config.experimental?.exposeTestingApiInProductionBuild).toBe(false);
  });
});
