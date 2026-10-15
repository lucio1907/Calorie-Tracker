import { ChevronLeft, ChevronRight } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { addDays, type CalendarDate } from "@/domain";
import { formatDiaryDate, MAX_DIARY_DATE, MIN_DIARY_DATE, relativeDay } from "../lib/diary-date";
import { diaryStrings } from "../strings";

const t = diaryStrings.dateNav;

/** URL of a day-based screen (`basePath`) for a day; today is the bare path. */
export function dayHref(basePath: string, date: CalendarDate, today: CalendarDate): string {
  return date === today ? basePath : `${basePath}?date=${date}`;
}

/** Diary URL for a day; today is the bare /diary. */
export function diaryHref(date: CalendarDate, today: CalendarDate): string {
  return dayHref("/diary", date, today);
}

type DateNavProps = {
  date: CalendarDate;
  today: CalendarDate;
  /** A date picked in the native date input. */
  onPick: (date: CalendarDate) => void;
  /** Screen the links point to (?date=YYYY-MM-DD is appended). Defaults to the diary. */
  basePath?: string;
};

/** Previous / next day links, the current day's name, a date picker and a jump back to today. */
export function DateNav({ date, today, onPick, basePath = "/diary" }: DateNavProps) {
  const href = (day: CalendarDate) => dayHref(basePath, day, today);
  const inputId = `${basePath.replace(/[^a-z0-9]/gi, "")}-date`;
  const relative = relativeDay(date, today);
  const formatted = formatDiaryDate(date, today);
  const previous = addDays(date, -1);
  const next = addDays(date, 1);

  return (
    <nav aria-label={t.label} className="flex flex-col gap-8">
      <div className="flex items-center gap-8">
        {previous >= MIN_DIARY_DATE ? (
          <ButtonLink href={href(previous)} aria-label={t.previous} className="w-44 shrink-0 px-0">
            <ChevronLeft aria-hidden="true" size={20} />
          </ButtonLink>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col items-center text-center" aria-live="polite">
          <p className="text-body-lg font-semibold text-ink">{relative ? t.relative[relative] : formatted}</p>
          {relative ? <p className="text-caption text-ink-muted">{formatted}</p> : null}
        </div>
        {next <= MAX_DIARY_DATE ? (
          <ButtonLink href={href(next)} aria-label={t.next} className="w-44 shrink-0 px-0">
            <ChevronRight aria-hidden="true" size={20} />
          </ButtonLink>
        ) : null}
      </div>
      <div className="flex items-center justify-center gap-8">
        <label htmlFor={inputId} className="sr-only">
          {t.pickDate}
        </label>
        <input
          id={inputId}
          type="date"
          value={date}
          min={MIN_DIARY_DATE}
          max={MAX_DIARY_DATE}
          required
          onChange={(event) => {
            if (event.target.value) onPick(event.target.value);
          }}
          className="tabular min-h-44 rounded-inputs border border-input-border bg-surface px-12 text-body text-input-text"
        />
        {date !== today ? (
          <ButtonLink href={basePath} className="shrink-0">
            {t.today}
          </ButtonLink>
        ) : null}
      </div>
    </nav>
  );
}
