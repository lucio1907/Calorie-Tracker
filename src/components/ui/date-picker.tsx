"use client";

import { parseDate, type CalendarDate as AriaCalendarDate } from "@internationalized/date";
import { CalendarDays } from "lucide-react";
import {
  Button,
  DateInput,
  DatePicker as AriaDatePicker,
  DateSegment,
  Dialog,
  FieldError,
  Group,
  I18nProvider,
  Label,
  Popover,
  Text,
} from "react-aria-components";
import { Calendar } from "./calendar";
import { cn } from "./cn";
import { popoverClassName } from "./popover";

/**
 * YYYY-MM-DD -> React Aria date; null for "" or text that is not a date.
 * Years below 100 must survive the round trip: while a year is being typed
 * digit by digit the field reports 0001, 0019, 0199 and then 1990.
 */
function toAriaDate(value: string | undefined): AriaCalendarDate | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

type DatePickerProps = {
  label: string;
  /** Form field name: a hidden input submits the date as YYYY-MM-DD ("" while empty), like a native date input. */
  name?: string;
  /** YYYY-MM-DD, or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest selectable day (YYYY-MM-DD). */
  min?: string;
  /** Latest selectable day (YYYY-MM-DD). */
  max?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Date field styled like the Input Field: month/day/year segments you can
 * type into or step with the arrow keys, plus a button opening the Calendar
 * (month/year dropdowns for dates decades back). Days outside min/max are
 * disabled. Dates are plain calendar days: no time zone is involved.
 */
export function DatePicker({
  label,
  name,
  value,
  onChange,
  min,
  max,
  hint,
  error,
  required,
  disabled,
  className,
}: DatePickerProps) {
  const maxValue = toAriaDate(max);

  return (
    <I18nProvider locale="en-US">
      <AriaDatePicker
        name={name}
        value={toAriaDate(value)}
        onChange={(date) => onChange(date ? date.toString() : "")}
        minValue={toAriaDate(min)}
        maxValue={maxValue}
        // Segments start from the latest allowed day, never from the browser's "today".
        placeholderValue={maxValue ?? undefined}
        granularity="day"
        isRequired={required}
        isDisabled={disabled}
        isInvalid={error ? true : undefined}
        validationBehavior="aria"
        className={cn("group flex min-w-0 flex-col gap-4", className)}
      >
        <Label className="text-body font-medium text-ink">{label}</Label>
        <Group
          className={cn(
            "flex min-h-44 items-center gap-4 rounded-inputs border bg-surface pr-4 pl-12 text-body-lg text-input-text",
            "data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-focus data-[disabled]:opacity-60",
            error ? "border-danger-ink" : "border-input-border",
          )}
        >
          <DateInput className="flex min-w-0 flex-1 py-8 tabular-nums">
            {(segment) => (
              <DateSegment
                segment={segment}
                className="rounded-inputs px-1 outline-none data-[focused]:bg-brand data-[focused]:text-on-action data-[placeholder]:text-ink-subtle data-[type=literal]:px-0 data-[focused]:data-[placeholder]:text-on-action"
              />
            )}
          </DateInput>
          {/* 36px icon button with a 44px hit area. */}
          <Button className="relative inline-flex size-36 shrink-0 items-center justify-center rounded-buttons text-ink transition-[background-color,transform] duration-150 after:absolute after:-inset-4 after:content-[''] hover:bg-surface-alt motion-safe:active:scale-95 disabled:cursor-not-allowed">
            <CalendarDays aria-hidden="true" size={20} />
          </Button>
        </Group>
        {hint ? (
          <Text slot="description" className="text-caption text-ink-muted">
            {hint}
          </Text>
        ) : null}
        <FieldError className="text-body text-danger-ink">{error}</FieldError>
        <Popover placement="bottom end" className={popoverClassName("overflow-y-auto p-12")}>
          <Dialog className="outline-none">
            <Calendar />
          </Dialog>
        </Popover>
      </AriaDatePicker>
    </I18nProvider>
  );
}
