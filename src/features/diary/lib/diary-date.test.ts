import { describe, expect, it } from "vitest";
import { diaryDateSchema, formatDiaryDate, relativeDay, resolveDiaryDate } from "./diary-date";

const today = "2026-10-14";

describe("resolveDiaryDate", () => {
  it("defaults to today when no date is given", () => {
    expect(resolveDiaryDate(undefined, today)).toBe(today);
  });

  it("uses a valid date from the URL", () => {
    expect(resolveDiaryDate("2026-10-01", today)).toBe("2026-10-01");
  });

  it.each([
    ["an impossible day", "2026-02-30"],
    ["a non-ISO format", "14/10/2026"],
    ["an empty string", ""],
    ["a repeated parameter", ["2026-10-01", "2026-10-02"]],
    ["a year before the supported range", "1899-12-31"],
    ["a year after the supported range", "9999-12-31"],
  ])("falls back to today for %s", (_label, value) => {
    expect(resolveDiaryDate(value, today)).toBe(today);
  });
});

describe("diaryDateSchema", () => {
  it("accepts a supported calendar date", () => {
    expect(diaryDateSchema.safeParse("2026-10-14").success).toBe(true);
  });

  it.each([["2026-02-30"], ["2026-10-14T00:00"], [20261014], ["1999-12-31"], ["2101-01-01"]])("rejects %j", (value) => {
    expect(diaryDateSchema.safeParse(value).success).toBe(false);
  });
});

describe("relativeDay", () => {
  it.each([
    ["2026-10-14", "today"],
    ["2026-10-13", "yesterday"],
    ["2026-10-15", "tomorrow"],
    ["2026-10-12", null],
  ])("%s is %s", (date, expected) => {
    expect(relativeDay(date, today)).toBe(expected);
  });

  it("works across a month boundary", () => {
    expect(relativeDay("2026-09-30", "2026-10-01")).toBe("yesterday");
  });
});

describe("formatDiaryDate", () => {
  it("shows weekday, month and day for the current year", () => {
    expect(formatDiaryDate("2026-10-14", today)).toBe("Wednesday, October 14");
  });

  it("adds the year when it differs from today's", () => {
    expect(formatDiaryDate("2025-12-31", today)).toBe("Wednesday, December 31, 2025");
  });

  it("never shifts the day with the time zone", () => {
    // A naive new Date("2026-01-01") is UTC midnight: Dec 31 in Buenos Aires.
    expect(formatDiaryDate("2026-01-01", today)).toBe("Thursday, January 1");
  });
});
