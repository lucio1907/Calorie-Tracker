import { describe, expect, it } from "vitest";
import { addDays, ageOnDate, calendarDateInZone, isCalendarDate, minutesOfDayInZone } from "./calendar-date";

const BUENOS_AIRES = "America/Argentina/Buenos_Aires";

describe("isCalendarDate", () => {
  it.each(["2026-10-14", "2024-02-29", "2000-01-01"])("accepts %s", (value) => {
    expect(isCalendarDate(value)).toBe(true);
  });

  it.each(["2026-02-29", "2026-13-01", "2026-10-32", "2026-10-1", "14/10/2026", "2026-10-14T00:00", "", "abcd-ef-gh"])(
    "rejects %j",
    (value) => {
      expect(isCalendarDate(value)).toBe(false);
    },
  );
});

describe("addDays", () => {
  it("moves across month and year boundaries", () => {
    expect(addDays("2026-10-14", -1)).toBe("2026-10-13");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("is not affected by daylight saving transitions", () => {
    // Pure calendar arithmetic: no time zone involved.
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
  });
});

describe("calendarDateInZone", () => {
  it("returns the local day, not the UTC day", () => {
    // 01:30 UTC on Oct 15 is still 22:30 on Oct 14 in Buenos Aires (UTC-3).
    const instant = new Date("2026-10-15T01:30:00Z");
    expect(instant.toISOString().slice(0, 10)).toBe("2026-10-15");
    expect(calendarDateInZone(instant, BUENOS_AIRES)).toBe("2026-10-14");
  });

  it("switches to the next day at local midnight", () => {
    expect(calendarDateInZone(new Date("2026-10-15T02:59:59Z"), BUENOS_AIRES)).toBe("2026-10-14");
    expect(calendarDateInZone(new Date("2026-10-15T03:00:00Z"), BUENOS_AIRES)).toBe("2026-10-15");
  });
});

describe("minutesOfDayInZone", () => {
  it("returns minutes since local midnight", () => {
    // 15:45 UTC = 12:45 in Buenos Aires.
    expect(minutesOfDayInZone(new Date("2026-10-14T15:45:30Z"), BUENOS_AIRES)).toBe(12 * 60 + 45);
  });

  it("is 0 at local midnight", () => {
    expect(minutesOfDayInZone(new Date("2026-10-15T03:00:00Z"), BUENOS_AIRES)).toBe(0);
  });
});

describe("ageOnDate", () => {
  it("counts whole years, turning a year older on the birthday", () => {
    expect(ageOnDate("1990-10-15", "2026-10-14")).toBe(35);
    expect(ageOnDate("1990-10-15", "2026-10-15")).toBe(36);
    expect(ageOnDate("1990-10-15", "2026-12-31")).toBe(36);
  });

  it("treats a 29 February birthday as reached on 1 March in common years", () => {
    expect(ageOnDate("2004-02-29", "2026-02-28")).toBe(21);
    expect(ageOnDate("2004-02-29", "2026-03-01")).toBe(22);
  });

  it("is zero or negative for birth dates on or after the date", () => {
    expect(ageOnDate("2026-10-15", "2026-10-15")).toBe(0);
    expect(ageOnDate("2027-01-01", "2026-10-15")).toBe(-1);
  });
});
