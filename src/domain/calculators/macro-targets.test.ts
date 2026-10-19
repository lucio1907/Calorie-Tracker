import { describe, expect, it } from "vitest";
import { InvalidArgumentError } from "./assert";
import { DEFAULT_CARB_FAT_SPLIT, macroTargets, type MacroTargetsInput } from "./macro-targets";

const base: MacroTargetsInput = { targetKcal: 2500, weightKg: 80, proteinGPerKg: 1.8, split: { carbs: 60, fat: 40 } };

describe("macroTargets", () => {
  it("takes protein from body weight and splits the kcal left between carbs and fat", () => {
    // 80 kg x 1.8 = 144 g = 576 kcal; 1924 kcal left: 60% / 4 = 288.6 g, 40% / 9 = 85.5 g.
    expect(macroTargets(base)).toEqual({ grams: { protein: 144, carbs: 289, fat: 86 }, proteinCapped: false });
  });

  it("keeps protein constant in a deficit: only carbs and fat shrink", () => {
    const maintain = macroTargets(base);
    const deficit = macroTargets({ ...base, targetKcal: 1950 });

    expect(deficit.grams.protein).toBe(maintain.grams.protein);
    // 1950 - 576 = 1374 kcal left: 60% / 4 = 206.1 g, 40% / 9 = 61.1 g.
    expect(deficit.grams).toEqual({ protein: 144, carbs: 206, fat: 61 });
  });

  it("recalculates protein when the weight changes", () => {
    // 75.4 kg x 1.8 = 135.72 -> 136 g; 2500 - 544 = 1956 kcal left.
    expect(macroTargets({ ...base, weightKg: 75.4 }).grams).toEqual({ protein: 136, carbs: 293, fat: 87 });
  });

  it("follows the protein setting", () => {
    // 80 x 2.2 = 176 g = 704 kcal; 1796 left.
    expect(macroTargets({ ...base, proteinGPerKg: 2.2 }).grams).toEqual({ protein: 176, carbs: 269, fat: 80 });
  });

  it("rounds protein to whole grams before splitting what is left", () => {
    // 81.25 x 1.8 = 146.25 -> 146 g = 584 kcal (not 585); 1916 kcal left: 287.4 g carbs, 85.2 g fat.
    expect(macroTargets({ ...base, weightKg: 81.25 }).grams).toEqual({ protein: 146, carbs: 287, fat: 85 });
  });

  it("rounds each macro half up", () => {
    // 2000 kcal, 50 kg x 2.5 = 125 g = 500 kcal; 1500 left at 50/50: 187.5 g carbs, 83.3 g fat.
    expect(
      macroTargets({ targetKcal: 2000, weightKg: 50, proteinGPerKg: 2.5, split: { carbs: 50, fat: 50 } }).grams,
    ).toEqual({ protein: 125, carbs: 188, fat: 83 });
  });

  it("puts everything left into one macro when the other gets 0%", () => {
    expect(macroTargets({ ...base, split: { carbs: 0, fat: 100 } }).grams).toEqual({ protein: 144, carbs: 0, fat: 214 });
    expect(macroTargets({ ...base, split: { carbs: 100, fat: 0 } }).grams).toEqual({ protein: 144, carbs: 481, fat: 0 });
  });

  it("caps protein to the target when the protein setting needs every kcal or more", () => {
    // 130 kg x 3 = 390 g = 1560 kcal, above a 1201 kcal target: 1201 / 4 = 300.25 -> 300 g.
    expect(macroTargets({ ...base, targetKcal: 1201, weightKg: 130, proteinGPerKg: 3 })).toEqual({
      grams: { protein: 300, carbs: 0, fat: 0 },
      proteinCapped: true,
    });
  });

  it("caps when protein exactly fills the target", () => {
    // 100 kg x 3 = 300 g = 1200 kcal.
    expect(macroTargets({ ...base, targetKcal: 1200, weightKg: 100, proteinGPerKg: 3 })).toEqual({
      grams: { protein: 300, carbs: 0, fat: 0 },
      proteinCapped: true,
    });
  });

  it("does not cap while there are kcal left", () => {
    // 100 kg x 3 = 300 g = 1200 kcal of 1204: 4 kcal left.
    expect(macroTargets({ ...base, targetKcal: 1204, weightKg: 100, proteinGPerKg: 3 })).toEqual({
      grams: { protein: 300, carbs: 1, fat: 0 },
      proteinCapped: false,
    });
  });

  it("defaults to a 60/40 carbs/fat split", () => {
    expect(DEFAULT_CARB_FAT_SPLIT).toEqual({ carbs: 60, fat: 40 });
  });

  it.each([
    ["a target of 0", { targetKcal: 0 }],
    ["no weight", { weightKg: 0 }],
    ["a protein setting of 0", { proteinGPerKg: 0 }],
    ["a negative share", { split: { carbs: -10, fat: 110 } }],
    ["a split with no share", { split: { carbs: 0, fat: 0 } }],
  ])("rejects %s", (_label, overrides) => {
    expect(() => macroTargets({ ...base, ...overrides })).toThrow(InvalidArgumentError);
  });
});
