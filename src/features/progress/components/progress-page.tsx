import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { progressStrings } from "../strings";

/** Placeholder until the progress feature is built. */
export function ProgressPage() {
  return (
    <div className="flex flex-col gap-24">
      <PageHeader title={progressStrings.title} description={progressStrings.description} />
      <EmptyState
        message={progressStrings.empty}
        action={<ButtonLink href="/settings">{progressStrings.emptyAction}</ButtonLink>}
      />
    </div>
  );
}
