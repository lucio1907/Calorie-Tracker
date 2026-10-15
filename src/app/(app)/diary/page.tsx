import type { Metadata } from "next";
import { DiaryPage, diaryStrings } from "@/features/diary";

export const metadata: Metadata = { title: diaryStrings.title };

export default function DiaryRoute({ searchParams }: PageProps<"/diary">) {
  return <DiaryPage searchParams={searchParams} />;
}
