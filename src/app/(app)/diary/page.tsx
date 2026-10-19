import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/ui";
import { DiaryPage, diaryStrings } from "@/features/diary";
import { PageSkeleton } from "@/features/shell";

export const metadata: Metadata = { title: diaryStrings.title };

/**
 * This boundary covers navigations into the page; ./layout.tsx adds the one
 * that covers navigations that only change the search params.
 */
export default function DiaryRoute({ searchParams }: PageProps<"/diary">) {
  return (
    <PageTransition>
      <Suspense fallback={<PageSkeleton title={diaryStrings.title} description={diaryStrings.description} />}>
        <DiaryPage searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}
