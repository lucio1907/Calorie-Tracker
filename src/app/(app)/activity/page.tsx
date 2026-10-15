import type { Metadata } from "next";
import { PageTransition } from "@/components/ui";
import { ActivityPage, activityStrings } from "@/features/activity";

export const metadata: Metadata = { title: activityStrings.title };

export default function ActivityRoute({ searchParams }: PageProps<"/activity">) {
  return (
    <PageTransition>
      <ActivityPage searchParams={searchParams} />
    </PageTransition>
  );
}
