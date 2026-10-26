import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { ZXING_WASM_SHA256 } from "barcode-detector/ponyfill";
import { describe, expect, it } from "vitest";

describe("public/zxing_reader.wasm", () => {
  // useBarcodeScanner serves the decoder from /public; a dependency bump must copy the new build there.
  it("matches the zxing-wasm build barcode-detector expects", () => {
    const served = createHash("sha256").update(readFileSync("public/zxing_reader.wasm")).digest("hex");
    expect(served, "run: cp node_modules/zxing-wasm/dist/reader/zxing_reader.wasm public/").toBe(ZXING_WASM_SHA256);
  });
});
