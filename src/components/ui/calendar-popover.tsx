"use client";

import { parseDate, toCalendarDate, toZoned } from "@internationalized/date";
import { useState, type ReactNode } from "react";
import { Button, Dialog, DialogTrigger, I18nProvider, Popover } from "react-aria-components";
import { Calendar } from "./calendar";
import { popoverClassName } from "./popover";

type CalendarPopoverProps = {
  /** Selected day, YYYY-MM-DD. */
  value: string;
  min: string;
  max: string;
  /** The app's calendar day (YYYY-MM-DD), highlighted in the grid. */
  today: string;
  /**
   * The app time zone. The calendar reasons in it (React Aria's own "today"
   * in cell labels included) instead of the browser's zone.
   */
  timeZone: string;
  onChange: (value: string) => void;
  /** Accessible name of the calendar dialog. */
  label: string;
  /** Trigger content (the button's accessible name). */
  children: ReactNode;
  triggerClassName?: string;
};

/** A button that opens a Calendar in a popover to jump to any day; picking a day closes it. */
export function CalendarPopover({
  value,
  min,
  max,
  today,
  timeZone,
  onChange,
  label,
  children,
  triggerClassName,
}: CalendarPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <I18nProvider locale="en-US">
      <DialogTrigger isOpen={open} onOpenChange={setOpen}>
        <Button className={triggerClassName}>{children}</Button>
        <Popover className={popoverClassName("overflow-y-auto p-12")}>
          <Dialog aria-label={label} className="outline-none">
            <Calendar
              aria-label={label}
              autoFocus
              today={today}
              value={toZoned(parseDate(value), timeZone)}
              minValue={parseDate(min)}
              maxValue={parseDate(max)}
              onChange={(date) => {
                setOpen(false);
                const picked = toCalendarDate(date).toString();
                if (picked !== value) onChange(picked);
              }}
            />
          </Dialog>
        </Popover>
      </DialogTrigger>
    </I18nProvider>
  );
}
