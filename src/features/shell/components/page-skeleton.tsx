import { shellStrings } from "../strings";

/** Neutral placeholder while the session is verified. Reserves space to avoid layout shift. */
export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-16">
      <span className="sr-only">{shellStrings.loading}</span>
      <div aria-hidden="true" className="h-32 w-160 animate-pulse rounded-buttons bg-surface-alt" />
      <div aria-hidden="true" className="h-160 w-full animate-pulse rounded-cards bg-surface-alt" />
    </div>
  );
}
