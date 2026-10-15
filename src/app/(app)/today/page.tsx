import type { Metadata } from "next";
import { PageTransition } from "@/components/ui";
import { TodayPage, todayStrings } from "@/features/today";

export const metadata: Metadata = { title: todayStrings.title };

export default function TodayRoute() {
  return (
    <PageTransition>
      <TodayPage />
    </PageTransition>
  );
}
