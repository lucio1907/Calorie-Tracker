"use client";

import { ChevronRight } from "lucide-react";
import { Card, cn, PillBadge, presenceProps, useListPresence, type Presence } from "@/components/ui";
import type { CalendarDate } from "@/domain";
import { formatDiaryDate } from "@/features/diary/lib/diary-date";
import { formatKg, formatSignedKg } from "../lib/format";
import type { WeightEntry } from "../lib/types";
import { progressStrings } from "../strings";

const t = progressStrings;

export type WeightLogRow = WeightEntry & { changeKg: number | null };

function Row({
  row,
  today,
  onEdit,
}: {
  row: Presence<WeightLogRow>;
  today: CalendarDate;
  onEdit: (entry: WeightEntry) => void;
}) {
  const entry = row.item;
  const { className, ...presence } = presenceProps(row.phase);
  return (
    <li className={cn("border-t border-border first:border-t-0", className)} {...presence}>
      <button
        type="button"
        onClick={() => onEdit(entry)}
        className="flex min-h-56 w-full items-center gap-12 px-16 py-12 text-left transition-colors duration-150 hover:bg-surface-alt active:bg-surface-alt"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-4">
          <span className="text-body-lg text-ink">{formatDiaryDate(entry.date, today)}</span>
          {entry.changeKg !== null ? (
            <span>
              <PillBadge className="tabular">{t.entries.changeFromPrevious(formatSignedKg(entry.changeKg))}</PillBadge>
            </span>
          ) : null}
        </span>
        <span className="tabular shrink-0 text-body-lg text-ink">{t.weight.kg(formatKg(entry.kg))}</span>
        <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-ink-subtle" />
      </button>
    </li>
  );
}

const rowKey = (row: WeightLogRow) => row.id;

type WeightEntryListProps = {
  /** Entries newest first, each with the change from the one before it. */
  rows: readonly WeightLogRow[];
  today: CalendarDate;
  onEdit: (entry: WeightEntry) => void;
};

/** The range's weight entries, newest first; each opens the editor. Also the chart's table view. */
export function WeightEntryList({ rows, today, onEdit }: WeightEntryListProps) {
  // Added entries rise in and deleted ones fade out (after the Server Action refresh).
  const presence = useListPresence(rows, rowKey);

  return (
    <Card aria-labelledby="progress-entries" className="flex flex-col gap-12">
      <h2 id="progress-entries" className="text-body font-semibold text-ink">
        {t.entries.heading}
      </h2>
      {presence.length > 0 ? (
        <ul aria-label={t.entries.list} className="-mx-16 -mb-16 border-t border-border">
          {presence.map((row) => (
            <Row key={row.key} row={row} today={today} onEdit={onEdit} />
          ))}
        </ul>
      ) : (
        <p className="text-body text-ink-muted">{t.entries.empty}</p>
      )}
    </Card>
  );
}
