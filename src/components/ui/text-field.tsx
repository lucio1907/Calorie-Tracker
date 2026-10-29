import { useId, type ComponentProps } from "react";
import { cn } from "./cn";

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  error?: string;
  hint?: string;
};

/** Input Field from design.md: 1px input-border, 12px radius, visible label. */
export function TextField({ label, error, hint, className, ...inputProps }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <label htmlFor={id} className="text-body font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "min-h-44 w-full min-w-0 rounded-inputs border bg-surface px-12 py-8 text-body-lg text-input-text placeholder:text-ink-subtle",
          error ? "border-danger-ink" : "border-input-border",
        )}
        {...inputProps}
      />
      {hint ? (
        <p id={hintId} className="text-caption text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-body text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
