import type { ReactNode } from "react";

type EmptyStateProps = {
  message: string;
  action?: ReactNode;
};

/** Empty state from design.md: a short sentence and one outlined action. No illustrations. */
export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-12 rounded-largecards bg-surface-muted p-16">
      <p className="text-body-lg text-ink-muted">{message}</p>
      {action}
    </div>
  );
}
