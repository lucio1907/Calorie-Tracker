import { PillBadge } from "@/components/ui";
import type { FoodSource } from "../lib/types";
import { foodsStrings } from "../strings";

/** Where a food's values come from, as a Pill Badge (ARGENFOODS / Open Food Facts / Custom). */
export function SourceBadge({ source }: { source: FoodSource }) {
  return <PillBadge data-source={source}>{foodsStrings.sources[source]}</PillBadge>;
}
