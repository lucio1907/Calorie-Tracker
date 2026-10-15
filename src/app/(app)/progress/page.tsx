import type { Metadata } from "next";
import { ProgressPage, progressStrings } from "@/features/progress";

export const metadata: Metadata = { title: progressStrings.title };

export default function ProgressRoute() {
  return <ProgressPage />;
}
