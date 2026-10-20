"use client";

import { ChevronRight } from "lucide-react";
import { ButtonLink, Card, cn, presenceProps, useListPresence, type Presence } from "@/components/ui";
import type { CalendarDate } from "@/domain";
import { formatDiaryDate } from "@/features/diary/lib/diary-date";
import { formatAmount, formatKcal } from "@/features/foods/lib/format";
import type { ActivityDay } from "../lib/activity-day";
import type { ActivityEntry, ActivityWeight } from "../lib/types";
import { activityStrings } from "../strings";

const t = activityStrings;

/** Which weight the kcal use, or a prompt to log one (adding is blocked without it). */
export function WeightNotice({ weight, today }: { weight: ActivityWeight | null; today: CalendarDate }) {
  if (weight) {
    return (
      <p className="text-body text-ink-muted">
        {t.weight.using(formatAmount(weight.kg), formatDiaryDate(weight.date, today))}
      </p>
    );
  }
  return (
    <div role="status" className="flex flex-col items-start gap-12 rounded-largecards bg-surface-muted p-16">
      <p className="text-body-lg text-ink">{t.weight.missing}</p>
      <ButtonLink href="/settings">{t.weight.missingAction}</ButtonLink>
    </div>
  );
}

function EntryRow({ row, onEdit }: { row: Presence<ActivityEntry>; onEdit: (entry: ActivityEntry) => void }) {
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
          <span className="line-clamp-2 text-body-lg text-ink">{entry.label}</span>
          <span className="tabular text-caption text-ink-muted">{t.units.minutes(formatAmount(entry.minutes))}</span>
        </span>
        <span className="tabular shrink-0 text-body-lg text-ink">
          {formatKcal(entry.kcal)}
          <span className="ml-4 font-sans text-caption text-ink-muted">{t.units.kcal}</span>
        </span>
        <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-ink-subtle" />
      </button>
    </li>
  );
}

const entryKey = (entry: ActivityEntry) => entry.id;

type ActivityDayViewProps = {
  day: ActivityDay;
  onEdit: (entry: ActivityEntry) => void;
};

/** The day's exercise total and its entries (each opens the editor), or an empty message. */
export function ActivityDayView({ day, onEdit }: ActivityDayViewProps) {
  // Added entries rise in and deleted ones fade out (after the Server Action refresh).
  const rows = useListPresence(day.entries, entryKey);

  return (
    <div className="flex flex-col gap-16">
      <Card aria-labelledby="activity-day-total" className="flex flex-col gap-4">
        <h2 id="activity-day-total" className="text-caption font-semibold tracking-wide text-ink-muted uppercase">
          {t.day.totalHeading}
        </h2>
        <p className="flex items-baseline gap-8">
          <span className="display-text tabular text-heading-lg text-ink">{formatKcal(day.totalKcal)}</span>
          <span className="text-body text-ink-muted">{t.units.kcal}</span>
          {day.entries.length > 0 ? (
            <span className="tabular text-body text-ink-muted">· {t.units.minutes(formatAmount(day.totalMinutes))}</span>
          ) : null}
        </p>
      </Card>

      {rows.length > 0 ? (
        <ul aria-label={t.day.entries} className="rounded-cards border border-border bg-surface">
          {rows.map((row) => (
            <EntryRow key={row.key} row={row} onEdit={onEdit} />
          ))}
        </ul>
      ) : (
        <p className="text-body text-ink-muted">{t.day.empty}</p>
      )}
    </div>
  );
}
