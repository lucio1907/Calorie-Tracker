import type { Metadata } from "next";
import { PageTransition } from "@/components/ui";
import { ProgressPage, progressStrings } from "@/features/progress";

export const metadata: Metadata = { title: progressStrings.title };

export default function ProgressRoute({ searchParams }: PageProps<"/progress">) {
  return (
    <PageTransition>
      <ProgressPage searchParams={searchParams} />
    </PageTransition>
  );
}
