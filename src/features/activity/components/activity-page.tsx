import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { activityStrings } from "../strings";

/** Placeholder until the activity feature is built. */
export function ActivityPage() {
  return (
    <div className="flex flex-col gap-24">
      <PageHeader title={activityStrings.title} description={activityStrings.description} />
      <EmptyState
        message={activityStrings.empty}
        action={<ButtonLink href="/today">{activityStrings.emptyAction}</ButtonLink>}
      />
    </div>
  );
}
