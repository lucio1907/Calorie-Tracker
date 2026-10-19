import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/ui";
import { ProgressPage, progressStrings } from "@/features/progress";
import { PageSkeleton } from "@/features/shell";

export const metadata: Metadata = { title: progressStrings.title };

/**
 * This boundary covers navigations into the page; ./layout.tsx adds the one
 * that covers navigations that only change the search params.
 */
export default function ProgressRoute({ searchParams }: PageProps<"/progress">) {
  return (
    <PageTransition>
      <Suspense fallback={<PageSkeleton title={progressStrings.title} description={progressStrings.description} />}>
        <ProgressPage searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}
