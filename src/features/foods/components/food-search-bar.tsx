import { Search, Star } from "lucide-react";
import { cn } from "@/components/ui";
import { foodsStrings } from "../strings";

const t = foodsStrings.search;

type FoodSearchBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (favoritesOnly: boolean) => void;
};

/** Search input (Input Field: black border) plus the favorites filter toggle. */
export function FoodSearchBar({ query, onQueryChange, favoritesOnly, onFavoritesOnlyChange }: FoodSearchBarProps) {
  return (
    <div className="flex flex-col gap-4">
      <label htmlFor="food-search" className="text-body font-medium text-ink">
        {t.label}
      </label>
      <div className="flex gap-8">
        <div className="relative min-w-0 flex-1">
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
        <button
          type="button"
          aria-pressed={favoritesOnly}
          onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
          className={cn(
            "inline-flex min-h-44 shrink-0 items-center gap-8 rounded-tags border px-16 text-body font-medium transition-colors duration-150",
            favoritesOnly
              ? "border-brand bg-nav-active text-ink-strong"
              : "border-border bg-surface text-ink hover:bg-surface-alt",
          )}
        >
          <Star aria-hidden="true" size={16} className={favoritesOnly ? "fill-brand text-brand" : undefined} />
          <span>{t.favoritesOnly}</span>
        </button>
      </div>
    </div>
  );
}
