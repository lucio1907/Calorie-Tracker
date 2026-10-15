"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { FoodResults } from "@/features/foods/components/food-results";
import { FoodSearchBar } from "@/features/foods/components/food-search-bar";
import { BarcodeLookupContainer } from "@/features/foods/containers/barcode-lookup-container";
import { useFoodSearch } from "@/features/foods/hooks/use-food-search";
import type { FoodSummary } from "@/features/foods/lib/types";
import { RecentFoods } from "../components/recent-foods";
import { diaryStrings } from "../strings";

const t = diaryStrings.add;

type FoodPickerContainerProps = {
  recentFoods: FoodSummary[];
  /** Server-rendered results for an empty query (favorites and own foods first). */
  initialFoods: FoodSummary[];
  onPick: (foodId: number) => void;
  onSearchOff: (query: string) => void;
  onCreateFood: () => void;
};

/**
 * First step of "add food": recent foods, catalog search (with the favorites
 * filter), barcode lookup, Open Food Facts search and custom food creation,
 * all reused from the foods feature.
 */
export function FoodPickerContainer({
  recentFoods,
  initialFoods,
  onPick,
  onSearchOff,
  onCreateFood,
}: FoodPickerContainerProps) {
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { foods, status, reload } = useFoodSearch(query, favoritesOnly, initialFoods);
  const browsing = query.trim() === "" && !favoritesOnly;

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
