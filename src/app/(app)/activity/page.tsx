import type { Metadata } from "next";
import { ActivityPage, activityStrings } from "@/features/activity";

export const metadata: Metadata = { title: activityStrings.title };

export default function ActivityRoute() {
  return <ActivityPage />;
}
