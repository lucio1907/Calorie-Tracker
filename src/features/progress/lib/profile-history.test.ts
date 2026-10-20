import { describe, expect, it } from "vitest";
import type { TodayProfile } from "@/features/today/lib/today-summary";
import { profileOnDate, type ProfileVersion } from "./profile-history";

function profile(goal: string): TodayProfile {
  return {
    sex: "male",
    birthDate: "1990-05-10",
    heightCm: 180,
    activityLevel: "moderate",
    goal,
    goalKgPerWeek: goal === "maintain" ? 0 : 0.5,
    proteinGPerKg: 1.8,
    carbFatSplit: { carbs: 60, fat: 40 },
  };
}

const versions: ProfileVersion[] = [
  { effectiveDate: "2026-10-05", profile: profile("maintain") },
  { effectiveDate: "2026-10-10", profile: profile("lose") },
  { effectiveDate: "2026-10-15", profile: profile("gain") },
];

describe("profileOnDate", () => {
  it("uses the version that starts on that day", () => {
    expect(profileOnDate(versions, "2026-10-10")?.goal).toBe("lose");
  });

  it("keeps a version until the next one starts", () => {
    expect(profileOnDate(versions, "2026-10-05")?.goal).toBe("maintain");
    expect(profileOnDate(versions, "2026-10-09")?.goal).toBe("maintain");
    expect(profileOnDate(versions, "2026-10-14")?.goal).toBe("lose");
  });

  it("uses the latest version for days after it", () => {
    expect(profileOnDate(versions, "2026-12-31")?.goal).toBe("gain");
  });

  it("falls back to the earliest version for days before any", () => {
    expect(profileOnDate(versions, "2026-09-01")?.goal).toBe("maintain");
  });

  it("returns null without any version", () => {
    expect(profileOnDate([], "2026-10-10")).toBeNull();
  });
});
