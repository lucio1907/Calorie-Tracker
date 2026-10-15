import type { Metadata } from "next";
import { PageTransition } from "@/components/ui";
import { DiaryPage, diaryStrings } from "@/features/diary";

export const metadata: Metadata = { title: diaryStrings.title };

export default function DiaryRoute({ searchParams }: PageProps<"/diary">) {
  return (
    <PageTransition>
      <DiaryPage searchParams={searchParams} />
    </PageTransition>
  );
}
