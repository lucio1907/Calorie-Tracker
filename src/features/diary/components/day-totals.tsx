import { Card } from "@/components/ui";
import type { Nutrients } from "@/domain";
import { formatAmount, formatKcal } from "@/features/foods/lib/format";
import { diaryStrings } from "../strings";

const t = diaryStrings;

const MACROS = [
  { key: "protein", label: t.nutrients.protein, dotClass: "bg-protein" },
  { key: "carbs", label: t.nutrients.carbs, dotClass: "bg-carbs" },
  { key: "fat", label: t.nutrients.fat, dotClass: "bg-fat" },
] as const;

/** Day total: kcal plus protein, carbs and fat in grams. */
export function DayTotals({ totals }: { totals: Nutrients }) {
  return (
    <Card aria-labelledby="diary-day-total" className="flex flex-wrap items-end justify-between gap-16">
      <div className="flex flex-col gap-4">
        <h2 id="diary-day-total" className="text-caption font-semibold tracking-wide text-ink-muted uppercase">
          {t.day.totalsHeading}
        </h2>
        <p className="flex items-baseline gap-8">
          <span className="display-text tabular text-heading-lg text-ink">{formatKcal(totals.kcal)}</span>
          <span className="text-body text-ink-muted">{t.nutrients.kcal}</span>
        </p>
      </div>
      <dl className="flex flex-wrap gap-x-16 gap-y-8 text-body">
        {MACROS.map((macro) => (
          <div key={macro.key} className="flex items-center gap-8">
            <span aria-hidden="true" className={`size-8 rounded-full ${macro.dotClass}`} />
            <dt className="text-ink-muted">{macro.label}</dt>
            <dd className="tabular text-ink">
              {formatAmount(totals[macro.key])}
              <span className="ml-4 font-sans text-caption text-ink-muted">{t.nutrients.grams}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
