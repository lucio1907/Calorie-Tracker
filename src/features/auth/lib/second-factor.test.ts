import { describe, expect, it } from "vitest";
import { parseTotpCode, secondFactorDue, verifyPath } from "./second-factor";

describe("parseTotpCode", () => {
  it("accepts 6 digits, with or without spaces", () => {
    expect(parseTotpCode("123456")).toBe("123456");
    expect(parseTotpCode(" 123 456 ")).toBe("123456");
  });

  it("rejects anything else", () => {
    for (const value of ["", "12345", "1234567", "12a456", null, 123456]) expect(parseTotpCode(value)).toBeNull();
  });
});

describe("verifyPath", () => {
  it("carries the next path, or nothing for the default", () => {
    expect(verifyPath("/diary?date=2026-10-01")).toBe("/login/verify?next=%2Fdiary%3Fdate%3D2026-10-01");
    expect(verifyPath("/today")).toBe("/login/verify");
  });
});

describe("secondFactorDue", () => {
  it("is due only for aal1 with a next level of aal2", () => {
    expect(secondFactorDue({ currentLevel: "aal1", nextLevel: "aal2" })).toBe(true);
    expect(secondFactorDue({ currentLevel: "aal1", nextLevel: "aal1" })).toBe(false);
    expect(secondFactorDue({ currentLevel: "aal2", nextLevel: "aal2" })).toBe(false);
    // Factor removed elsewhere: the token is still aal2 until it refreshes.
    expect(secondFactorDue({ currentLevel: "aal2", nextLevel: "aal1" })).toBe(false);
    expect(secondFactorDue(null)).toBe(false);
  });
});
