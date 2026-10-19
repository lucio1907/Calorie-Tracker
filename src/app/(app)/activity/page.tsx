import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/ui";
import { ActivityPage, activityStrings } from "@/features/activity";
import { PageSkeleton } from "@/features/shell";

export const metadata: Metadata = { title: activityStrings.title };

/**
 * This boundary covers navigations into the page; ./layout.tsx adds the one
 * that covers navigations that only change the search params.
 */
export default function ActivityRoute({ searchParams }: PageProps<"/activity">) {
  return (
    <PageTransition>
      <Suspense fallback={<PageSkeleton title={activityStrings.title} description={activityStrings.description} />}>
        <ActivityPage searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}
