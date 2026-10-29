import { Star } from "lucide-react";
import { Button } from "@/components/ui";
import { formatAmount, formatKcal } from "../lib/format";
import type { FoodFilter, FoodSummary } from "../lib/types";
import { foodsStrings } from "../strings";
import { SourceBadge } from "./source-badge";

const t = foodsStrings.search;
const n = foodsStrings.nutrients;

export type FoodResultsStatus = "idle" | "loading" | "error";

type FoodResultsProps = {
  foods: FoodSummary[];
  status: FoodResultsStatus;
  query: string;
  filter: FoodFilter;
  onSelect: (food: FoodSummary) => void;
  onRetry: () => void;
  /** Offers an Open Food Facts search for longer queries; omit to hide it. */
  onSearchOff?: () => void;
};

function FoodRow({ food, onSelect }: { food: FoodSummary; onSelect: (food: FoodSummary) => void }) {
  const secondary = food.brand ?? food.group;
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => onSelect(food)}
        className="flex min-h-56 w-full items-center gap-12 px-12 py-12 text-left transition-colors duration-150 hover:bg-surface-alt"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-4">
          <span className="line-clamp-2 text-body-lg text-ink">{food.name}</span>
          <span className="flex min-w-0 items-center gap-8">
            <SourceBadge source={food.source} />
            {secondary ? <span className="truncate text-caption text-ink-muted">{secondary}</span> : null}
          </span>
        </span>
        {food.isFavorite ? (
          <Star aria-label={t.favorite} role="img" size={16} className="shrink-0 fill-brand text-brand" />
        ) : null}
        <span className="flex shrink-0 flex-col items-end">
          <span className="tabular text-body-lg text-ink">
            {formatKcal(food.kcal)}
            <span className="ml-4 font-sans text-caption text-ink-muted">{n.kcalUnit}</span>
          </span>
          <span className="tabular hidden text-caption text-ink-muted sm:block">
            {n.short.protein} {formatAmount(food.protein)} · {n.short.carbs} {formatAmount(food.carbs)} ·{" "}
            {n.short.fat} {formatAmount(food.fat)}
          </span>
          <span className="text-caption text-ink-subtle sm:hidden">{t.perHundred}</span>
        </span>
      </button>
    </li>
  );
}

/** Search results as Dashboard Table Rows, with loading, error and empty states. */
/** Empty-state copy: the user's own lists explain how to fill them; searches name the text. */
function emptyMessage(filter: FoodFilter, trimmed: string): string {
  if (filter === "favorites") return t.noFavorites;
  if (filter === "custom" && !trimmed) return t.noCustom;
  return trimmed ? t.noMatches(trimmed) : t.emptyCatalog;
}

export function FoodResults({ foods, status, query, filter, onSelect, onRetry, onSearchOff }: FoodResultsProps) {
  const trimmed = query.trim();
  // Open Food Facts can add catalog foods, not favorites or the user's own.
  const offerOff = onSearchOff && trimmed.length >= 3 && (filter === "all" || filter === "off");

  if (status === "error") {
    return (
      <div role="alert" className="flex flex-col items-start gap-12 rounded-cards border border-border p-16">
        <p className="text-body text-danger-ink">{t.error}</p>
        <Button onClick={onRetry}>{t.retry}</Button>
      </div>
    );
  }

  if (foods.length === 0 && status !== "loading") {
    const message = emptyMessage(filter, trimmed);
    return (
      <div className="flex flex-col items-start gap-12 rounded-largecards bg-surface-muted p-16">
        <p className="text-body-lg text-ink-muted">{message}</p>
        {offerOff ? <Button onClick={onSearchOff}>{t.tryOff}</Button> : null}
      </div>
    );
  }

  return (
    <section aria-labelledby="food-results-heading" aria-busy={status === "loading"} className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between gap-12">
        <h2 id="food-results-heading" className="text-body font-semibold text-ink">
          {t.resultsHeading}
        </h2>
        <p aria-live="polite" className="text-caption text-ink-muted">
          {status === "loading" ? t.loading : `${t.resultCount(foods.length)} · ${t.perHundred}`}
        </p>
      </div>
      <ul className={`rounded-cards border border-border bg-surface transition-opacity duration-150 ${status === "loading" ? "opacity-60" : ""}`}>
        {foods.map((food) => (
          <FoodRow key={food.id} food={food} onSelect={onSelect} />
        ))}
      </ul>
      {offerOff ? (
        <div>
          <Button variant="ghost" onClick={onSearchOff}>
            {t.tryOff}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
