import { ChevronRight, Search } from "lucide-react";
import { formatAmount } from "@/features/foods/lib/format";
import type { CatalogActivity } from "../lib/types";
import { activityStrings } from "../strings";

const t = activityStrings;

type ActivityPickerProps = {
  query: string;
  onQueryChange: (query: string) => void;
  /** Catalog rows already filtered by `query`. */
  activities: readonly CatalogActivity[];
  onPick: (activity: CatalogActivity) => void;
};

/** First step of "log activity": a search box over the MET catalog and the matching rows. */
export function ActivityPicker({ query, onQueryChange, activities, onPick }: ActivityPickerProps) {
  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-col gap-4">
        <label htmlFor="activity-search" className="text-body font-medium text-ink">
          {t.add.search}
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            size={18}
            className="pointer-events-none absolute top-1/2 left-12 -translate-y-1/2 text-ink-subtle"
          />
          <input
            id="activity-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t.add.searchPlaceholder}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            maxLength={100}
            className="min-h-44 w-full rounded-inputs border border-input-border bg-surface py-8 pr-12 pl-40 text-body-lg text-input-text placeholder:text-ink-subtle"
          />
        </div>
      </div>

      {activities.length > 0 ? (
        <ul aria-label={t.add.catalog} className="rounded-cards border border-border">
          {activities.map((activity) => (
            <li key={activity.id} className="border-t border-border first:border-t-0">
              <button
                type="button"
                onClick={() => onPick(activity)}
                className="flex min-h-56 w-full items-center gap-12 px-16 py-12 text-left transition-colors duration-150 hover:bg-surface-alt"
              >
                <span className="min-w-0 flex-1 text-body-lg text-ink">{activity.name}</span>
                <span className="tabular shrink-0 text-caption text-ink-muted">
                  {t.units.met(formatAmount(activity.met))}
                </span>
                <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-ink-subtle" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p role="status" className="text-body text-ink-muted">
          {t.add.noResults(query.trim())}
        </p>
      )}
    </div>
  );
}
