import { describe, expect, it } from "vitest";
import { filterActivities } from "./activity-search";
import type { CatalogActivity } from "./types";

const catalog: CatalogActivity[] = [
  { id: 1, name: "Walking, brisk (5.6-6.3 km/h)", met: 4.8, category: "walking" },
  { id: 2, name: "Running, 10 km/h", met: 9.3, category: "running" },
  { id: 3, name: "Natación, libre", met: 5.8, category: "swimming" },
];

describe("filterActivities", () => {
  it("returns the whole catalog for a blank query", () => {
    expect(filterActivities(catalog, "  ")).toEqual(catalog);
  });

  it("matches every word in any order, ignoring case", () => {
    expect(filterActivities(catalog, "KM/H run").map((activity) => activity.id)).toEqual([2]);
    expect(filterActivities(catalog, "km/h").map((activity) => activity.id)).toEqual([1, 2]);
  });

  it("ignores accents", () => {
    expect(filterActivities(catalog, "natacion").map((activity) => activity.id)).toEqual([3]);
  });

  it("returns nothing when no name matches", () => {
    expect(filterActivities(catalog, "rowing")).toEqual([]);
  });
});
