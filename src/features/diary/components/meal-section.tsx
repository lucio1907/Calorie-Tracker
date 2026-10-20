"use client";

import { ChevronRight, Plus } from "lucide-react";
import { Button, cn, presenceProps, useListPresence, type Presence } from "@/components/ui";
import { formatAmount, formatKcal } from "@/features/foods/lib/format";
import type { MealSection as MealSectionData } from "../lib/diary-day";
import type { DiaryEntry } from "../lib/types";
import { diaryStrings } from "../strings";
import { MacroLine } from "./macro-line";

const t = diaryStrings;

/** "2 × 1 slice · 50 g" or "150 g". */
export function amountText(entry: Pick<DiaryEntry, "grams" | "quantity" | "portionLabel">): string {
  const grams = formatAmount(entry.grams);
  return entry.quantity !== null && entry.portionLabel !== null
    ? t.units.portion(formatAmount(entry.quantity), entry.portionLabel, grams)
    : t.units.grams(grams);
}

const entryKey = (entry: DiaryEntry) => entry.id;

type MealSectionProps = {
  section: MealSectionData;
  onAdd: () => void;
  onEdit: (entry: DiaryEntry) => void;
};

function EntryRow({ row, onEdit }: { row: Presence<DiaryEntry>; onEdit: (entry: DiaryEntry) => void }) {
  const entry = row.item;
  const { className, ...presence } = presenceProps(row.phase);
  return (
    <li className={cn("border-t border-border", className)} {...presence}>
      <button
        type="button"
        onClick={() => onEdit(entry)}
        className="flex min-h-56 w-full items-center gap-12 px-16 py-12 text-left transition-colors duration-150 hover:bg-surface-alt active:bg-surface-alt"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-4">
          <span className="line-clamp-2 text-body-lg text-ink">{entry.label}</span>
          <span className="tabular text-caption text-ink-muted">{amountText(entry)}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-4">
          <span className="tabular text-body-lg text-ink">
            {formatKcal(entry.kcal)}
            <span className="ml-4 font-sans text-caption text-ink-muted">{t.nutrients.kcal}</span>
          </span>
          <MacroLine nutrients={entry} className="hidden text-caption text-ink-muted sm:block" />
        </span>
        <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-ink-subtle" />
      </button>
    </li>
  );
}

/** One meal: name, totals, an add button and the entries (each opens the editor). */
export function MealSection({ section, onAdd, onEdit }: MealSectionProps) {
  const name = t.meals[section.meal];
  // Added entries rise in and deleted ones fade out (after the Server Action refresh).
  const rows = useListPresence(section.entries, entryKey);
  const headingId = `meal-${section.meal}`;

  return (
    <section aria-labelledby={headingId} className="rounded-cards border border-border bg-surface">
      <header className="flex items-center justify-between gap-12 py-8 pr-8 pl-16">
        <div className="flex min-w-0 flex-col">
          <h2 id={headingId} className="text-body-lg font-semibold text-ink">
            {name}
          </h2>
          <p className="text-caption text-ink-muted">
            <span className="sr-only">{t.meal.total(name)}: </span>
            <span className="tabular">{formatKcal(section.totals.kcal)}</span> {t.nutrients.kcal}
            {section.entries.length > 0 ? (
              <>
                <span aria-hidden="true"> · </span>
                <MacroLine nutrients={section.totals} />
              </>
            ) : null}
          </p>
        </div>
        <Button variant="ghost" onClick={onAdd} aria-label={t.meal.addTo(name)} className="shrink-0 px-12">
          <Plus aria-hidden="true" size={18} />
          <span aria-hidden="true">{t.meal.add}</span>
        </Button>
      </header>
      {rows.length > 0 ? (
        <ul aria-label={t.meal.entries(name)}>
          {rows.map((row) => (
            <EntryRow key={row.key} row={row} onEdit={onEdit} />
          ))}
        </ul>
      ) : (
        <p className="border-t border-border px-16 py-12 text-body text-ink-muted">{t.meal.empty}</p>
      )}
    </section>
  );
}
