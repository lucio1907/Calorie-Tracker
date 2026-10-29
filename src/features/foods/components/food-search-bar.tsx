import { Search, Star } from "lucide-react";
import { cn } from "@/components/ui";
import { FOOD_FILTERS, type FoodFilter } from "../lib/types";
import { foodsStrings } from "../strings";

const t = foodsStrings.search;

type FoodSearchBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  filter: FoodFilter;
  onFilterChange: (filter: FoodFilter) => void;
};

/** Search input (Input Field: black border) plus the category chips (one pressed at a time). */
export function FoodSearchBar({ query, onQueryChange, filter, onFilterChange }: FoodSearchBarProps) {
  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <label htmlFor="food-search" className="text-body font-medium text-ink">
          {t.label}
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            size={18}
            className="pointer-events-none absolute top-1/2 left-12 -translate-y-1/2 text-ink-subtle"
          />
          <input
            id="food-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t.placeholder}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            maxLength={100}
            className="min-h-44 w-full rounded-inputs border border-input-border bg-surface py-8 pr-12 pl-40 text-body-lg text-input-text placeholder:text-ink-subtle"
          />
        </div>
      </div>
      {/* Wraps instead of scrolling, so every category stays visible at any text size. */}
      <div role="group" aria-label={t.filterLabel} className="flex flex-wrap gap-8">
        {FOOD_FILTERS.map((option) => {
          const pressed = option === filter;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={pressed}
              onClick={() => onFilterChange(option)}
              className={cn(
                "inline-flex min-h-44 items-center gap-8 rounded-tags border px-12 text-body font-medium transition-colors duration-150",
                pressed
                  ? "border-brand bg-nav-active text-ink-strong"
                  : "border-border bg-surface text-ink hover:bg-surface-alt",
              )}
            >
              {option === "favorites" ? (
                <Star aria-hidden="true" size={16} className={pressed ? "fill-brand text-brand" : undefined} />
              ) : null}
              <span>{t.filters[option]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
