import { useId, type ComponentProps } from "react";
import { cn } from "./cn";

type SelectFieldProps = Omit<ComponentProps<"select">, "id"> & {
  label: string;
  error?: string;
};

/** Native select styled like the Input Field (black 1px border, 6px radius, visible label). */
export function SelectField({ label, error, className, children, ...selectProps }: SelectFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <label htmlFor={id} className="text-body font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "min-h-44 rounded-inputs border bg-surface px-12 py-8 text-body-lg text-input-text",
          error ? "border-danger-ink" : "border-input-border",
        )}
        {...selectProps}
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} className="text-body text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
