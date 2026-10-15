"use client";

import { Check, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import {
  Button,
  FieldError,
  I18nProvider,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select as AriaSelect,
  SelectValue,
  Text,
} from "react-aria-components";
import { cn } from "./cn";
import { popoverClassName } from "./popover";

export type SelectOption = { value: string; label: string };

type SelectProps = {
  label: string;
  /** Keep the label for assistive tech only (e.g. month/year pickers inside a calendar). */
  hideLabel?: boolean;
  /** Form field name: a hidden native <select> submits `value` under it, as a native select would. */
  name?: string;
  options: readonly SelectOption[];
  /** Selected option value; "" when nothing is selected yet. */
  value: string;
  onChange: (value: string) => void;
  /** Text shown while `value` is "". */
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Single-choice select styled like the Input Field (black 1px border, 6px
 * radius, visible label) with a listbox popover. Built on React Aria: the
 * trigger is a button with aria-haspopup="listbox"; arrows, Home/End,
 * type-ahead, Enter and Escape work as on a native select, and the popover
 * renders inside an open Sheet (see Sheet's portal provider).
 */
export function Select({
  label,
  hideLabel = false,
  name,
  options,
  value,
  onChange,
  placeholder,
  hint,
  error,
  required,
  disabled,
  className,
}: SelectProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <I18nProvider locale="en-US">
      <AriaSelect
        name={name}
        value={value === "" ? null : value}
        onChange={(key) => onChange(key === null ? "" : String(key))}
        isRequired={required}
        isDisabled={disabled}
        isInvalid={error ? true : undefined}
        validationBehavior="aria"
        placeholder={placeholder}
        isOpen={open}
        onOpenChange={(next) => {
          // A <fieldset disabled> disables the trigger natively, but pointer
          // events still reach it in some browsers and React Aria only knows
          // about isDisabled: never open from a disabled trigger.
          if (next && triggerRef.current?.matches(":disabled")) return;
          setOpen(next);
        }}
        className={cn("group flex min-w-0 flex-col gap-4", className)}
      >
        <Label className={hideLabel ? "sr-only" : "text-body font-medium text-ink"}>{label}</Label>
        <Button
          ref={triggerRef}
          className={cn(
            "flex min-h-44 w-full min-w-0 items-center gap-8 rounded-inputs border bg-surface px-12 py-8 text-left text-body-lg text-input-text transition-[background-color,border-color] duration-150 ease-out hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60",
            error ? "border-danger-ink" : "border-input-border",
          )}
        >
          <SelectValue className="min-w-0 flex-1 truncate data-[placeholder]:text-ink-subtle">
            {({ isPlaceholder, selectedText }) => (isPlaceholder ? (placeholder ?? "") : selectedText)}
          </SelectValue>
          <ChevronDown
            aria-hidden="true"
            size={18}
            className="shrink-0 text-ink-muted transition-transform duration-200 ease-enter group-data-[open]:rotate-180"
          />
        </Button>
        {hint ? (
          <Text slot="description" className="text-caption text-ink-muted">
            {hint}
          </Text>
        ) : null}
        <FieldError className="text-body text-danger-ink">{error}</FieldError>
        <Popover className={popoverClassName("max-h-320 min-w-(--trigger-width) overflow-y-auto p-4")}>
          <ListBox className="flex flex-col gap-2 outline-none">
            {options.map((option) => (
              <ListBoxItem
                key={option.value}
                id={option.value}
                textValue={option.label}
                className="flex min-h-44 cursor-pointer items-center gap-8 rounded-inputs px-12 py-8 text-body-lg text-ink outline-none transition-colors duration-100 data-[focus-visible]:outline-2 data-[focus-visible]:-outline-offset-2 data-[focus-visible]:outline-focus data-[focused]:bg-surface-alt data-[selected]:font-medium data-[selected]:text-ink-strong"
              >
                {({ isSelected }) => (
                  <>
                    <span className="min-w-0 flex-1">{option.label}</span>
                    <Check
                      aria-hidden="true"
                      size={16}
                      className={cn("shrink-0 text-brand", isSelected ? "opacity-100" : "opacity-0")}
                    />
                  </>
                )}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </AriaSelect>
    </I18nProvider>
  );
}
