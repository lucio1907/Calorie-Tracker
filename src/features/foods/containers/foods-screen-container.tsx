"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, PageHeader, Sheet } from "@/components/ui";
import { FoodResults } from "../components/food-results";
import { FoodSearchBar } from "../components/food-search-bar";
import { useFoodSearch } from "../hooks/use-food-search";
import type { FoodDetail, FoodSummary } from "../lib/types";
import { foodsStrings as t } from "../strings";
import { BarcodeLookupContainer } from "./barcode-lookup-container";
import { FoodDetailContainer } from "./food-detail-container";
import { FoodFormContainer } from "./food-form-container";
import { OffSearchContainer } from "./off-search-container";

type Panel =
  | { kind: "detail"; foodId: number; title: string | null }
  | { kind: "create" }
  | { kind: "edit"; food: FoodDetail }
  | { kind: "off"; query: string };

function panelTitle(panel: Panel): string {
  switch (panel.kind) {
    case "detail":
      return panel.title ?? t.detail.loading;
    case "create":
      return t.form.createHeading;
    case "edit":
      return t.form.editHeading;
    case "off":
      return t.off.heading;
  }
}

/** Foods screen: search, favorites filter, barcode lookup, results and the side panel. */
export function FoodsScreenContainer({ initialFoods }: { initialFoods: FoodSummary[] }) {
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const { foods, status, reload } = useFoodSearch(query, favoritesOnly, initialFoods);

  const openDetail = useCallback((foodId: number, title: string | null = null) => {
    setPanel({ kind: "detail", foodId, title });
  }, []);

  const handleLoaded = useCallback((food: FoodDetail) => {
    setPanel((current) =>
      current?.kind === "detail" && current.foodId === food.id && current.title !== food.name
        ? { ...current, title: food.name }
        : current,
    );
  }, []);

  const closePanel = useCallback(() => setPanel(null), []);

  function handleSaved(foodId: number) {
    reload();
    openDetail(foodId);
  }

  function renderPanel(current: Panel) {
    switch (current.kind) {
      case "detail":
        return (
          <FoodDetailContainer
            key={current.foodId}
            foodId={current.foodId}
            onLoaded={handleLoaded}
            onEdit={(food) => setPanel({ kind: "edit", food })}
            onDeleted={() => {
              reload();
              closePanel();
            }}
            onChanged={reload}
          />
        );
      case "create":
        return <FoodFormContainer onSaved={handleSaved} onCancel={closePanel} />;
      case "edit":
        return (
          <FoodFormContainer
            key={current.food.id}
            food={current.food}
            onSaved={handleSaved}
            onCancel={() => openDetail(current.food.id, current.food.name)}
          />
        );
      case "off":
        return <OffSearchContainer key={current.query} initialQuery={current.query} onImported={handleSaved} />;
    }
  }

  return (
    <div className="flex flex-col gap-24">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button variant="primary" onClick={() => setPanel({ kind: "create" })}>
            <Plus aria-hidden="true" size={18} />
            <span>{t.newFood}</span>
          </Button>
        }
      />

      <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-start">
        <FoodSearchBar
          query={query}
          onQueryChange={setQuery}
          favoritesOnly={favoritesOnly}
          onFavoritesOnlyChange={setFavoritesOnly}
        />
        <BarcodeLookupContainer onFound={(foodId) => {
          reload();
          openDetail(foodId);
        }} />
      </div>

      <FoodResults
        foods={foods}
        status={status}
        query={query}
        favoritesOnly={favoritesOnly}
        onSelect={(food) => openDetail(food.id, food.name)}
        onRetry={reload}
        onSearchOff={() => setPanel({ kind: "off", query: query.trim() })}
      />

      <Sheet
        open={panel !== null}
        onClose={closePanel}
        title={panel ? panelTitle(panel) : ""}
        closeLabel={t.detail.close}
      >
        {panel ? renderPanel(panel) : null}
      </Sheet>
    </div>
  );
}
