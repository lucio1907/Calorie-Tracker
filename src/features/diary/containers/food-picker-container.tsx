"use client";

import { Plus, ScanBarcode } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { FoodResults } from "@/features/foods/components/food-results";
import { FoodSearchBar } from "@/features/foods/components/food-search-bar";
import { BarcodeLookupContainer } from "@/features/foods/containers/barcode-lookup-container";
import { useFoodSearch } from "@/features/foods/hooks/use-food-search";
import type { FoodFilter, FoodSummary } from "@/features/foods/lib/types";
import type { Recipe } from "@/features/recipes/lib/types";
import { RecentFoods } from "../components/recent-foods";
import { RecipeOptions } from "../components/recipe-options";
import { diaryStrings } from "../strings";

const t = diaryStrings.add;

/** Case- and accent-insensitive text for matching recipe names. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

type FoodPickerContainerProps = {
  recentFoods: FoodSummary[];
  /** Server-rendered results for an empty query (favorites and own foods first). */
  initialFoods: FoodSummary[];
  /** The caller's recipes; filtered here by name (the catalog search covers foods only). */
  recipes: Recipe[];
  onPick: (foodId: number) => void;
  onPickRecipe: (recipe: Recipe) => void;
  onSearchOff: (query: string) => void;
  onCreateFood: () => void;
};

/**
 * First step of "add food", top to bottom: the catalog search with its
 * category chips, the other ways to add (barcode lookup, folded until asked
 * for, and a new custom food), then recent foods (only while browsing
 * everything), the caller's recipes (they count as the caller's own) and the
 * results. Search, barcode and creation are reused from the foods feature.
 */
export function FoodPickerContainer({
  recentFoods,
  initialFoods,
  recipes,
  onPick,
  onPickRecipe,
  onSearchOff,
  onCreateFood,
}: FoodPickerContainerProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FoodFilter>("all");
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const { foods, status, reload } = useFoodSearch(query, filter, initialFoods);
  const browsing = query.trim() === "" && filter === "all";
  const needle = fold(query.trim());
  const showRecipes = filter === "all" || filter === "custom";
  const matchingRecipes = showRecipes ? recipes.filter((recipe) => fold(recipe.name).includes(needle)) : [];

  return (
    <div className="flex flex-col gap-24">
      <div className="flex flex-col gap-12">
        <FoodSearchBar query={query} onQueryChange={setQuery} filter={filter} onFilterChange={setFilter} />
        <div className="grid grid-cols-2 gap-8">
          <Button aria-expanded={barcodeOpen} aria-controls="picker-barcode" onClick={() => setBarcodeOpen(!barcodeOpen)}>
            <ScanBarcode aria-hidden="true" size={18} />
            <span>{t.barcode}</span>
          </Button>
          <Button onClick={onCreateFood}>
            <Plus aria-hidden="true" size={18} />
            <span>{t.newFood}</span>
          </Button>
        </div>
        {barcodeOpen ? (
          <div id="picker-barcode" className="rounded-cards bg-surface-muted p-12">
            <BarcodeLookupContainer onFound={onPick} />
          </div>
        ) : null}
      </div>
      {browsing ? <RecentFoods foods={recentFoods} onSelect={(food) => onPick(food.id)} /> : null}
      {matchingRecipes.length > 0 ? <RecipeOptions recipes={matchingRecipes} onSelect={onPickRecipe} /> : null}
      <FoodResults
        foods={foods}
        status={status}
        query={query}
        filter={filter}
        onSelect={(food) => onPick(food.id)}
        onRetry={reload}
        onSearchOff={() => onSearchOff(query.trim())}
      />
    </div>
  );
}
