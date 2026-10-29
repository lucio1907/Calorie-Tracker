import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getProfileVersions = vi.fn();
const getTodayProfile = vi.fn();
const getLatestWeight = vi.fn();
const getExerciseKcal = vi.fn();
vi.mock("@/features/progress/data/progress", () => ({ getProfileVersions: (...a: unknown[]) => getProfileVersions(...a) }));
vi.mock("@/features/today/data/today", () => ({
  getTodayProfile: (...a: unknown[]) => getTodayProfile(...a),
  getExerciseKcal: (...a: unknown[]) => getExerciseKcal(...a),
}));
vi.mock("@/features/settings/data/settings", () => ({ getLatestWeight: (...a: unknown[]) => getLatestWeight(...a) }));

const { getDayTargetInputs } = await import("./day-target");

const profile = { sex: "male", birthDate: "1996-01-01", heightCm: 180, activityLevel: "moderate", goal: "maintain" };
const older = { ...profile, activityLevel: "light" };

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("getDayTargetInputs", () => {
  it("uses the profile version, weight and exercise of the viewed day", async () => {
    getProfileVersions.mockResolvedValue([
      { effectiveDate: "2026-10-01", profile: older },
      { effectiveDate: "2026-10-20", profile },
    ]);
    getLatestWeight.mockResolvedValue({ kg: 80, date: "2026-10-10" });
    getExerciseKcal.mockResolvedValue([120]);

    expect(await getDayTargetInputs("user-a", "2026-10-15")).toEqual({ profile: older, weightKg: 80, exerciseKcal: [120] });
    expect(getLatestWeight).toHaveBeenCalledWith("user-a", "2026-10-15");
    expect(getTodayProfile).not.toHaveBeenCalled();
  });

  it("falls back to the current profile when there is no version yet", async () => {
    getProfileVersions.mockResolvedValue([]);
    getTodayProfile.mockResolvedValue(profile);
    getLatestWeight.mockResolvedValue(null);
    getExerciseKcal.mockResolvedValue([]);

    expect(await getDayTargetInputs("user-a", "2026-10-15")).toEqual({ profile, weightKg: null, exerciseKcal: [] });
  });

  it("answers null instead of throwing when a read fails, so the diary still renders", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getProfileVersions.mockResolvedValue([]);
    getTodayProfile.mockResolvedValue(profile);
    getLatestWeight.mockRejectedValue(new Error("weight down"));
    getExerciseKcal.mockResolvedValue([]);

    expect(await getDayTargetInputs("user-a", "2026-10-15")).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});
