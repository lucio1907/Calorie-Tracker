import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/ui";
import { insightsStrings } from "@/features/insights";
import { InsightsPage } from "@/features/insights/components/insights-page";
import { PageSkeleton } from "@/features/shell";

export const metadata: Metadata = { title: insightsStrings.page.title };

/**
 * This boundary covers navigations into the page; ./layout.tsx adds the one
 * that covers navigations that only change the search params.
 */
export default function InsightsRoute({ searchParams }: PageProps<"/insights">) {
  return (
    <PageTransition>
      <Suspense fallback={<PageSkeleton title={insightsStrings.page.title} description={insightsStrings.page.description} />}>
        <InsightsPage searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}
