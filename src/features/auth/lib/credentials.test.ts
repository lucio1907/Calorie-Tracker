import { describe, expect, it } from "vitest";
import { authStrings } from "../strings";
import { parseCredentials } from "./credentials";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("parseCredentials", () => {
  it("accepts a trimmed email and an untouched password", () => {
    expect(parseCredentials(form({ email: "  owner@local.test ", password: " secret " }))).toEqual({
      ok: true,
      value: { email: "owner@local.test", password: " secret " },
    });
  });

  it("requires both fields", () => {
    expect(parseCredentials(form({}))).toEqual({
      ok: false,
      email: "",
      errors: { email: authStrings.emailRequired, password: authStrings.passwordRequired },
    });
  });

  it("rejects a malformed email and keeps it for re-display", () => {
    expect(parseCredentials(form({ email: "owner", password: "x" }))).toEqual({
      ok: false,
      email: "owner",
      errors: { email: authStrings.emailInvalid },
    });
  });

  it("rejects an oversized email without running the pattern on it", () => {
    // About 1 MB: the shape makes the email pattern backtrack quadratically.
    const email = `a@${".".repeat(1_000_000)}@`;
    const startedAt = performance.now();
    const result = parseCredentials(form({ email, password: "x" }));
    const elapsed = performance.now() - startedAt;

    expect(result).toMatchObject({ ok: false, errors: { email: authStrings.emailInvalid } });
    expect(elapsed).toBeLessThan(50);
  });
});
