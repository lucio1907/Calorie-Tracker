import { SearchParamsSuspense } from "@/components/ui";
import { progressStrings } from "@/features/progress";
import { PageSkeleton } from "@/features/shell";

/*
 * When only the search params change (another day or range), the page
 * segment stays mounted and waits for the server as a whole, so the page's
 * own <Suspense> cannot show its fallback. This boundary sits above the page
 * and starts over for every new set of search params, so those navigations
 * show the skeleton right away too.
 */
export default function ProgressLayout({ children }: LayoutProps<"/progress">) {
  return (
    <SearchParamsSuspense fallback={<PageSkeleton title={progressStrings.title} description={progressStrings.description} />}>
      {children}
    </SearchParamsSuspense>
  );
}
