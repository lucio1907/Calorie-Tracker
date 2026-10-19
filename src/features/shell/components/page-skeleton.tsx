import { PageHeader } from "@/components/ui";
import { shellStrings } from "../strings";

type PageSkeletonProps = {
  /** The page's static title: rendered for real so it lands in the shell. */
  title?: string;
  /** Static description under the title (omit when it depends on request data). */
  description?: string;
};

/**
 * Placeholder while a page's per-user data streams in. With a title it is a
 * page's whole fallback (real heading, placeholder content); without one it
 * stands in for a section below a heading the page already renders.
 * Reserves space to avoid layout shift.
 */
export function PageSkeleton({ title, description }: PageSkeletonProps = {}) {
  return (
    <div className="flex flex-col gap-24">
      {title ? <PageHeader title={title} description={description} /> : null}
      <div role="status" aria-live="polite" className="flex flex-col gap-16">
        <span className="sr-only">{shellStrings.loading}</span>
        {title ? null : <div aria-hidden="true" className="h-32 w-160 animate-pulse rounded-buttons bg-surface-alt" />}
        <div aria-hidden="true" className="h-160 w-full animate-pulse rounded-cards bg-surface-alt" />
      </div>
    </div>
  );
}
