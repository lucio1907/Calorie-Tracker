"use client";

import type { DateValue } from "@internationalized/date";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useContext } from "react";
import {
  Button,
  Calendar as AriaCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarMonthPicker,
  CalendarStateContext,
  I18nProvider,
  type CalendarProps as AriaCalendarProps,
  type Key,
} from "react-aria-components";
import { cn } from "./cn";
import { Select } from "./select";

/** Years offered on each side of the focused year when the calendar has no min/max. */
const OPEN_YEAR_SPAN = 100;

const navButton =
  "inline-flex size-44 shrink-0 items-center justify-center rounded-buttons text-ink transition-[background-color,transform] duration-150 hover:bg-surface-alt motion-safe:active:scale-95 disabled:cursor-not-allowed disabled:text-ink-subtle disabled:hover:bg-transparent";

/** "month" (Intl) -> "Month". */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type PickerProps = {
  "aria-label": string;
  value: Key;
  onChange: (key: Key | null) => void;
  items: ReadonlyArray<{ id: number; formatted: string }>;
};

/** Month dropdown in the calendar header. */
function MonthSelect({ picker, className }: { picker: PickerProps; className?: string }) {
  return (
    <Select
      label={capitalize(picker["aria-label"])}
      hideLabel
      options={picker.items.map((item) => ({ value: String(item.id), label: item.formatted }))}
      value={String(picker.value)}
      onChange={(value) => picker.onChange(Number(value))}
      className={className}
    />
  );
}

/**
 * Every year between min and max (birth dates go back to 1900). Picking one
 * keeps the visible month, unlike React Aria's year picker, which snaps to
 * the month of the min date when the range is clamped.
 */
function YearSelect() {
  const state = useContext(CalendarStateContext);
  if (!state) return null;
  const focused = state.focusedDate;
  const first = state.minValue?.year ?? focused.year - OPEN_YEAR_SPAN;
  const last = state.maxValue?.year ?? focused.year + OPEN_YEAR_SPAN;
  const options = Array.from({ length: last - first + 1 }, (_, index) => {
    const year = String(first + index);
    return { value: year, label: year };
  });

  return (
    <Select
      label="Año"
      hideLabel
      options={options}
      value={String(focused.year)}
      // setFocusedDate keeps the day inside min/max.
      onChange={(year) => state.setFocusedDate(focused.set({ year: Number(year) }))}
      className="w-96 shrink-0"
    />
  );
}

export type CalendarProps<T extends DateValue> = Omit<AriaCalendarProps<T>, "className" | "children"> & {
  /** The app's calendar day (YYYY-MM-DD in the app time zone), highlighted in the grid. */
  today?: string;
  className?: string;
};

/**
 * Month grid on React Aria's Calendar: weeks start on Monday, month and
 * year dropdowns plus previous/next buttons, today outlined, the selected
 * day filled, days outside min/max disabled. Arrow keys, Page Up/Down
 * (Shift for years) and Home/End move through the grid; Enter picks.
 * Used alone or inside a DatePicker, which supplies value and limits.
 */
export function Calendar<T extends DateValue>({ today, className, ...props }: CalendarProps<T>) {
  return (
    <I18nProvider locale="es-AR">
      <AriaCalendar firstDayOfWeek="mon" className={cn("flex w-max max-w-full flex-col gap-8", className)} {...props}>
        <div className="flex items-center gap-4">
          <Button slot="previous" className={navButton}>
            <ChevronLeft aria-hidden="true" size={20} />
          </Button>
          <CalendarMonthPicker format="long">
            {(picker) => <MonthSelect picker={picker} className="min-w-0 flex-1" />}
          </CalendarMonthPicker>
          <YearSelect />
          <Button slot="next" className={navButton}>
            <ChevronRight aria-hidden="true" size={20} />
          </Button>
        </div>
        <CalendarGrid weekdayStyle="short" className="border-separate border-spacing-0">
          <CalendarGridHeader>
            {(day) => (
              <CalendarHeaderCell className="pb-4 text-caption font-medium text-ink-muted">{day}</CalendarHeaderCell>
            )}
          </CalendarGridHeader>
          <CalendarGridBody>
            {(date) => (
              <CalendarCell
                date={date}
                className={({ date: day, isSelected, isDisabled, isUnavailable, isOutsideMonth }) => {
                  const blocked = isDisabled || isUnavailable;
                  // "Today" is the server's app-time-zone day, never the browser's clock or zone.
                  const isToday = day.toString() === today;
                  return cn(
                    "m-auto flex size-36 min-[375px]:size-44 items-center justify-center rounded-full text-body tabular-nums outline-none transition-[background-color,color,transform] duration-150",
                    "data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-focus",
                    blocked
                      ? "cursor-not-allowed text-silver"
                      : "cursor-pointer motion-safe:data-[pressed]:scale-95",
                    !blocked && isSelected && "bg-brand font-semibold text-on-action data-[hovered]:bg-action-hover",
                    !blocked && !isSelected && "data-[hovered]:bg-surface-alt",
                    !blocked && !isSelected && (isToday ? "font-semibold text-brand ring-1 ring-brand ring-inset" : "text-ink"),
                    isOutsideMonth && "invisible",
                  );
                }}
              />
            )}
          </CalendarGridBody>
        </CalendarGrid>
      </AriaCalendar>
    </I18nProvider>
  );
}
