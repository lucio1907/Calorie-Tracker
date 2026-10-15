import { describe, expect, it } from "vitest";
import { entryLabel, MAX_LABEL_LENGTH } from "./entry-label";

describe("entryLabel", () => {
  it("uses the food name", () => {
    expect(entryLabel({ name: "Arroz blanco", brand: null })).toBe("Arroz blanco");
  });

  it("adds the brand when there is one", () => {
    expect(entryLabel({ name: "Yogur entero", brand: "La Serenísima" })).toBe("Yogur entero (La Serenísima)");
  });

  it("drops the brand when name and brand would not fit the column", () => {
    const name = "a".repeat(190);
    expect(entryLabel({ name, brand: "A long brand name" })).toBe(name);
  });

  it("never exceeds the column limit", () => {
    expect(entryLabel({ name: "b".repeat(250), brand: null })).toHaveLength(MAX_LABEL_LENGTH);
  });
});
