import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/ui";
import { RecipesPage, recipesStrings } from "@/features/recipes";
import { PageSkeleton } from "@/features/shell";

export const metadata: Metadata = { title: recipesStrings.title };

export default function RecipesRoute() {
  return (
    <PageTransition>
      <Suspense fallback={<PageSkeleton title={recipesStrings.title} description={recipesStrings.description} />}>
        <RecipesPage />
      </Suspense>
    </PageTransition>
  );
}
