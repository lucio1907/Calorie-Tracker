import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/ui";
import { FoodsPage, foodsStrings } from "@/features/foods";
import { PageSkeleton } from "@/features/shell";

export const metadata: Metadata = { title: foodsStrings.title };

export default function FoodsRoute() {
  return (
    <PageTransition>
      <Suspense fallback={<PageSkeleton title={foodsStrings.title} description={foodsStrings.description} />}>
        <FoodsPage />
      </Suspense>
    </PageTransition>
  );
}
