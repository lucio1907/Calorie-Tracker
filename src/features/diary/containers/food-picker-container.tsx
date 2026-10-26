"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { FoodResults } from "@/features/foods/components/food-results";
import { FoodSearchBar } from "@/features/foods/components/food-search-bar";
import { BarcodeLookupContainer } from "@/features/foods/containers/barcode-lookup-container";
import { useFoodSearch } from "@/features/foods/hooks/use-food-search";
import type { FoodSummary } from "@/features/foods/lib/types";
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
 * First step of "add food": recent foods, catalog search (with the favorites
 * filter), barcode lookup, Open Food Facts search and custom food creation,
 * all reused from the foods feature, plus the caller's recipes.
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
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { foods, status, reload } = useFoodSearch(query, favoritesOnly, initialFoods);
  const browsing = query.trim() === "" && !favoritesOnly;
  const needle = fold(query.trim());
  const matchingRecipes = favoritesOnly ? [] : recipes.filter((recipe) => fold(recipe.name).includes(needle));

  return (
    <div className="flex flex-col gap-16">
      <FoodSearchBar
        query={query}
        onQueryChange={setQuery}
        favoritesOnly={favoritesOnly}
        onFavoritesOnlyChange={setFavoritesOnly}
      />
      <BarcodeLookupContainer onFound={onPick} />
      <div>
        <Button onClick={onCreateFood}>
          <Plus aria-hidden="true" size={18} />
          <span>{t.newFood}</span>
        </Button>
      </div>
      {browsing ? <RecentFoods foods={recentFoods} onSelect={(food) => onPick(food.id)} /> : null}
      {matchingRecipes.length > 0 ? <RecipeOptions recipes={matchingRecipes} onSelect={onPickRecipe} /> : null}
      <FoodResults
        foods={foods}
        status={status}
        query={query}
        favoritesOnly={favoritesOnly}
        onSelect={(food) => onPick(food.id)}
        onRetry={reload}
        onSearchOff={() => onSearchOff(query.trim())}
      />
    </div>
  );
}
