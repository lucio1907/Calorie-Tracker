import { PageHeader } from "@/components/ui";
import { shellStrings } from "../strings";

type PageSkeletonProps = {
  /** The page's static title: rendered for real so it lands in the shell. */
  title?: string;
  /** Static description under the title (omit when it depends on request data). */
  description?: string;
};

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-surface-alt ${className}`} />;
}

/** A card-shaped placeholder: white on the canvas, so it reads as content loading rather than an empty page. */
function CardPlaceholder({ lines }: { lines: number }) {
  return (
    <div className="flex flex-col gap-12 rounded-cards border border-border bg-surface p-16">
      <Bar className="h-14 w-1/3" />
      <Bar className="h-28 w-1/2" />
      {Array.from({ length: lines }, (_, index) => (
        <Bar key={index} className={index % 2 === 0 ? "h-10 w-full" : "h-10 w-4/5"} />
      ))}
    </div>
  );
}

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
        <div aria-hidden="true" className="flex flex-col gap-16">
          {title ? null : <Bar className="h-32 w-160" />}
          <CardPlaceholder lines={2} />
          <CardPlaceholder lines={1} />
          <CardPlaceholder lines={1} />
        </div>
      </div>
    </div>
  );
}
