import { describe, expect, it } from "vitest";
import { formatCsv, parseCsv } from "./csv.mjs";

describe("parseCsv", () => {
  it("splits plain cells and rows", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("keeps separators, line breaks and escaped quotes inside quoted cells", () => {
    expect(parseCsv('1,"Arroz, grano","dice ""hola""\nadiós"\r\n')).toEqual([["1", "Arroz, grano", 'dice "hola"\nadiós']]);
  });

  it("handles CRLF, empty cells, a BOM and a missing trailing newline", () => {
    expect(parseCsv("﻿a,,c\r\nx,y,")).toEqual([
      ["a", "", "c"],
      ["x", "y", ""],
    ]);
  });

  it("rejects an unterminated quote", () => {
    expect(() => parseCsv('a,"open')).toThrow(/unterminated/);
  });
});

describe("formatCsv", () => {
  it("quotes only when needed and round-trips through parseCsv", () => {
    const rows = [
      ["code", "name", "kcal"],
      ["306", 'Leche, condensada "Nestlé"', 328],
      ["1", "Arroz", null],
    ];
    const text = formatCsv(rows);

    expect(text).toBe('code,name,kcal\n306,"Leche, condensada ""Nestlé""",328\n1,Arroz,\n');
    expect(parseCsv(text)).toEqual([
      ["code", "name", "kcal"],
      ["306", 'Leche, condensada "Nestlé"', "328"],
      ["1", "Arroz", ""],
    ]);
  });
});
