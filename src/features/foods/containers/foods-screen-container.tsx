"use client";

import { CookingPot, Globe, Plus } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button, ButtonLink, Card, PageHeader, Sheet } from "@/components/ui";
import { FoodPagination } from "../components/food-pagination";
import { FoodResults } from "../components/food-results";
import { FoodSearchBar } from "../components/food-search-bar";
import { useFoodSearch } from "../hooks/use-food-search";
import type { FoodDetail, FoodFilter, FoodSummary } from "../lib/types";
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

type FoodsScreenContainerProps = {
  /** Server-rendered first page for an empty query. */
  initialFoods: FoodSummary[];
  initialHasNextPage: boolean;
};

/**
 * Foods screen: the search with its category chips above the paged results,
 * and beside them (below on phones) the other ways to add foods: barcode
 * lookup and Open Food Facts. Details, creation and editing open in the side
 * panel.
 */
export function FoodsScreenContainer({ initialFoods, initialHasNextPage }: FoodsScreenContainerProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FoodFilter>("all");
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState<Panel | null>(null);
  const search = useFoodSearch(query, filter, initialFoods, { page, initialHasNextPage });
  const { foods, status, reload } = search;
  const resultsRef = useRef<HTMLDivElement>(null);

  // A new search or filter starts over from the first page.
  function changeQuery(next: string) {
    setQuery(next);
    setPage(1);
  }

  function changeFilter(next: FoodFilter) {
    setFilter(next);
    setPage(1);
  }

  function changePage(next: number) {
    setPage(next);
    resultsRef.current?.scrollIntoView?.({ block: "start" });
  }

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
        return <FoodFormContainer onSaved={handleSaved} onAddAnother={reload} onCancel={closePanel} />;
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
          <>
            <Button variant="primary" onClick={() => setPanel({ kind: "create" })}>
              <Plus aria-hidden="true" size={18} />
              <span>{t.newFood}</span>
            </Button>
            <ButtonLink href="/foods/recipes">
              <CookingPot aria-hidden="true" size={18} />
              <span>{t.recipes}</span>
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-start">
        <div className="flex flex-col gap-16">
          <FoodSearchBar query={query} onQueryChange={changeQuery} filter={filter} onFilterChange={changeFilter} />
          <div ref={resultsRef} className="flex flex-col gap-16">
            <FoodResults
              foods={foods}
              status={status}
              query={query}
              filter={filter}
              onSelect={(food) => openDetail(food.id, food.name)}
              onRetry={reload}
              onSearchOff={() => setPanel({ kind: "off", query: query.trim() })}
            />
            {status === "error" ? null : (
              <FoodPagination page={search.page} hasNextPage={search.hasNextPage} onPageChange={changePage} />
            )}
          </div>
        </div>

        <aside aria-labelledby="foods-add-more" className="lg:sticky lg:top-24">
          <Card className="flex flex-col gap-16">
            <div className="flex flex-col gap-4">
              <h2 id="foods-add-more" className="text-body-lg font-semibold text-ink">
                {t.addMore.heading}
              </h2>
              <p className="text-caption text-ink-muted">{t.addMore.description}</p>
            </div>
            <BarcodeLookupContainer
              onFound={(foodId) => {
                reload();
                openDetail(foodId);
              }}
            />
            <div className="border-t border-border pt-16">
              <Button className="w-full" onClick={() => setPanel({ kind: "off", query: query.trim() })}>
                <Globe aria-hidden="true" size={18} />
                <span>{t.search.tryOff}</span>
              </Button>
            </div>
          </Card>
        </aside>
      </div>

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
