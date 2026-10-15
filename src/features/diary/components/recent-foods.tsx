import { formatKcal } from "@/features/foods/lib/format";
import type { FoodSummary } from "@/features/foods/lib/types";
import { diaryStrings } from "../strings";

const t = diaryStrings;

type RecentFoodsProps = {
  foods: FoodSummary[];
  onSelect: (food: FoodSummary) => void;
};

/** The caller's recently logged foods, one tap away from the entry form. */
export function RecentFoods({ foods, onSelect }: RecentFoodsProps) {
  return (
    <section aria-labelledby="recent-foods-heading" className="flex flex-col gap-8">
      <h3 id="recent-foods-heading" className="text-body font-semibold text-ink">
        {t.add.recentHeading}
      </h3>
      {foods.length === 0 ? (
        <p className="text-body text-ink-muted">{t.add.noRecent}</p>
      ) : (
        <ul className="rounded-cards border border-border bg-surface">
          {foods.map((food) => (
            <li key={food.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => onSelect(food)}
                className="flex min-h-48 w-full items-center gap-12 px-12 py-8 text-left transition-colors duration-150 hover:bg-surface-alt"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body-lg text-ink">{food.name}</span>
                  {food.brand ? <span className="truncate text-caption text-ink-muted">{food.brand}</span> : null}
                </span>
                <span className="tabular shrink-0 text-body text-ink-muted">
                  {formatKcal(food.kcal)} {t.nutrients.kcal}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
