import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { ButtonLink, CalendarPopover, DAY_BACK, DAY_FORWARD, dayTransitionType } from "@/components/ui";
import { addDays, type CalendarDate } from "@/domain";
import { APP_TIME_ZONE } from "@/lib/app-time";
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
  /** A day picked in the calendar popover. */
  onPick: (date: CalendarDate) => void;
  /** Screen the links point to (?date=YYYY-MM-DD is appended). Defaults to the diary. */
  basePath?: string;
};

/**
 * Previous / next day links, the current day's name (a button opening a
 * calendar to jump to any day) and a jump back to today.
 */
export function DateNav({ date, today, onPick, basePath = "/diary" }: DateNavProps) {
  const href = (day: CalendarDate) => dayHref(basePath, day, today);
  const relative = relativeDay(date, today);
  const formatted = formatDiaryDate(date, today);
  const previous = addDays(date, -1);
  const next = addDays(date, 1);

  return (
    <nav aria-label={t.label} className="flex flex-col gap-8">
      <div className="flex items-center gap-8">
        {previous >= MIN_DIARY_DATE ? (
          <ButtonLink
            href={href(previous)}
            transitionTypes={[DAY_BACK]}
            aria-label={t.previous}
            className="w-44 shrink-0 px-0"
          >
            <ChevronLeft aria-hidden="true" size={20} />
          </ButtonLink>
        ) : null}
        <div className="flex min-w-0 flex-1 justify-center" aria-live="polite">
          <CalendarPopover
            value={date}
            min={MIN_DIARY_DATE}
            max={MAX_DIARY_DATE}
            today={today}
            timeZone={APP_TIME_ZONE}
            onChange={onPick}
            label={t.pickDate}
            triggerClassName="flex min-h-44 min-w-0 items-center gap-8 rounded-buttons px-12 py-4 text-center transition-[background-color,transform] duration-150 hover:bg-surface-alt motion-safe:active:scale-[0.98]"
          >
            <span className="flex min-w-0 flex-col items-center">
              <span className="sr-only">{t.pickDate}: </span>
              <span className="text-body-lg font-semibold text-ink">{relative ? t.relative[relative] : formatted}</span>
              {relative ? <span className="text-caption text-ink-muted">{formatted}</span> : null}
            </span>
            <CalendarDays aria-hidden="true" size={18} className="shrink-0 text-ink-muted" />
          </CalendarPopover>
        </div>
        {next <= MAX_DIARY_DATE ? (
          <ButtonLink href={href(next)} transitionTypes={[DAY_FORWARD]} aria-label={t.next} className="w-44 shrink-0 px-0">
            <ChevronRight aria-hidden="true" size={20} />
          </ButtonLink>
        ) : null}
      </div>
      {/* Only off today: an always-reserved row left a blank gap above the day's content. */}
      {date !== today ? (
        <div className="flex justify-center">
          <ButtonLink href={basePath} transitionTypes={[dayTransitionType(date, today)]} className="shrink-0">
            {t.today}
          </ButtonLink>
        </div>
      ) : null}
    </nav>
  );
}
