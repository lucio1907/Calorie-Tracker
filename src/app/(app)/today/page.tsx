import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/ui";
import { PageSkeleton } from "@/features/shell";
import { TodayPage, todayStrings } from "@/features/today";

export const metadata: Metadata = { title: todayStrings.title };

export default function TodayRoute() {
  return (
    <PageTransition>
      {/* The date line is request-time (app time zone), so the shell has the title only. */}
      <Suspense fallback={<PageSkeleton title={todayStrings.title} />}>
        <TodayPage />
      </Suspense>
    </PageTransition>
  );
}
