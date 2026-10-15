import { formatAmount, formatKcal } from "../lib/format";
import type { FoodDetail } from "../lib/types";
import { foodsStrings } from "../strings";

const n = foodsStrings.nutrients;

type Nutrients = Pick<FoodDetail, "kcal" | "protein" | "carbs" | "fat" | "fiber" | "sodiumMg">;

/** Nutrients per 100 g as Dashboard Table Rows; values in Geist Mono tabular figures. */
export function NutrientTable({ food }: { food: Nutrients }) {
  const rows: Array<{ label: string; value: string | null; unit: string }> = [
    { label: n.kcal, value: formatKcal(food.kcal), unit: n.kcalUnit },
    { label: n.protein, value: formatAmount(food.protein), unit: n.gramsUnit },
    { label: n.carbs, value: formatAmount(food.carbs), unit: n.gramsUnit },
    { label: n.fat, value: formatAmount(food.fat), unit: n.gramsUnit },
    { label: n.fiber, value: food.fiber === null ? null : formatAmount(food.fiber), unit: n.gramsUnit },
    { label: n.sodium, value: food.sodiumMg === null ? null : formatAmount(food.sodiumMg), unit: n.milligramsUnit },
  ];

  return (
    <dl className="rounded-cards border border-border">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-12 border-b border-border px-12 py-8 last:border-b-0">
          <dt className="text-body text-ink-muted">{row.label}</dt>
          <dd className="tabular text-body text-ink">
            {row.value === null ? (
              <>
                <span aria-hidden="true">{n.notReported}</span>
                <span className="sr-only">{n.notReportedLabel}</span>
              </>
            ) : (
              <>
                {row.value}
                <span className="ml-4 font-sans text-caption text-ink-muted">{row.unit}</span>
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
