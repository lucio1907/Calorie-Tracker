import { SearchParamsSuspense } from "@/components/ui";
import { insightsStrings } from "@/features/insights";
import { PageSkeleton } from "@/features/shell";

/*
 * When only the search params change (another range), the page segment
 * stays mounted and waits for the server as a whole, so the page's own
 * <Suspense> cannot show its fallback. This boundary sits above the page and
 * starts over for every new set of search params, so those navigations show
 * the skeleton right away too.
 */
export default function InsightsLayout({ children }: LayoutProps<"/insights">) {
  return (
    <SearchParamsSuspense fallback={<PageSkeleton title={insightsStrings.page.title} description={insightsStrings.page.description} />}>
      {children}
    </SearchParamsSuspense>
  );
}
