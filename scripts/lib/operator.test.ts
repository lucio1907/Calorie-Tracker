import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { isLocalSupabaseUrl, readSecret, remoteWriteRefusal } from "./operator.mjs";

describe("isLocalSupabaseUrl", () => {
  it.each([
    ["http://127.0.0.1:54321", true],
    ["http://localhost:54321", true],
    ["http://[::1]:54321", true],
    ["https://abcd.supabase.co", false],
    ["http://127.0.0.1.example.com", false],
  ])("%s -> %s", (url, expected) => {
    expect(isLocalSupabaseUrl(url)).toBe(expected);
  });
});

describe("remoteWriteRefusal", () => {
  it("lets writes to the local stack through", () => {
    expect(remoteWriteRefusal("http://127.0.0.1:54321", false)).toBeNull();
  });

  it("refuses a hosted project without --yes and names its host", () => {
    expect(remoteWriteRefusal("https://abcd.supabase.co", false)).toMatch(/abcd\.supabase\.co.*--yes/);
  });

  it("allows a hosted project with --yes", () => {
    expect(remoteWriteRefusal("https://abcd.supabase.co", true)).toBeNull();
  });
});

describe("readSecret", () => {
  it("reads the whole stream and drops one trailing line break", async () => {
    await expect(readSecret(Readable.from(["Str0ng", "Passphrase\n"]))).resolves.toBe("Str0ngPassphrase");
    await expect(readSecret(Readable.from(["Str0ngPassphrase\r\n"]))).resolves.toBe("Str0ngPassphrase");
  });

  it("keeps spaces that belong to the secret", async () => {
    await expect(readSecret(Readable.from([" two words "]))).resolves.toBe(" two words ");
  });
});
