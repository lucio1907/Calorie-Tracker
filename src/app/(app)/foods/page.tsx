import type { Metadata } from "next";
import { PageTransition } from "@/components/ui";
import { FoodsPage, foodsStrings } from "@/features/foods";

export const metadata: Metadata = { title: foodsStrings.title };

export default function FoodsRoute() {
  return (
    <PageTransition>
      <FoodsPage />
    </PageTransition>
  );
}
