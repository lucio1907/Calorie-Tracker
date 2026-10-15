"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Button, PageHeader, Sheet } from "@/components/ui";
import type { CalendarDate } from "@/domain";
import { DateNav, dayHref } from "@/features/diary/components/date-nav";
import { ActivityDayView, WeightNotice } from "../components/activity-day-view";
import { ActivityPicker } from "../components/activity-picker";
import type { ActivityDay } from "../lib/activity-day";
import { filterActivities } from "../lib/activity-search";
import type { ActivityEntry, ActivityWeight, CatalogActivity } from "../lib/types";
import { activityStrings as t } from "../strings";
import { AddActivityContainer, EditActivityContainer } from "./activity-entry-containers";

const BASE_PATH = "/activity";

type Panel = { kind: "pick" } | { kind: "log"; activity: CatalogActivity } | { kind: "edit"; entry: ActivityEntry };

type ActivityScreenContainerProps = {
  date: CalendarDate;
  today: CalendarDate;
  day: ActivityDay;
  catalog: CatalogActivity[];
  /** Latest weight on or before `date`; null blocks adding. */
  weight: ActivityWeight | null;
};

/**
 * Activity screen: date navigation, which weight kcal use, the day's total
 * and entries, and the sheet hosting the add flow (pick an activity ->
 * duration) and the entry editor. Mutations refresh the server-rendered day
 * in the same round trip.
 */
export function ActivityScreenContainer({ date, today, day, catalog, weight }: ActivityScreenContainerProps) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [query, setQuery] = useState("");
  const close = useCallback(() => setPanel(null), []);
  const matches = useMemo(() => filterActivities(catalog, query), [catalog, query]);

  function renderPanel(current: Panel) {
    switch (current.kind) {
      case "pick":
        return (
          <ActivityPicker
            query={query}
            onQueryChange={setQuery}
            activities={matches}
            onPick={(activity) => setPanel({ kind: "log", activity })}
          />
        );
      case "log":
        // The add button is hidden without a weight, so this only guards a stale panel.
        return weight ? (
          <AddActivityContainer
            key={current.activity.id}
            activity={current.activity}
            date={date}
            weight={weight}
            onSaved={close}
            onBack={() => setPanel({ kind: "pick" })}
          />
        ) : (
          <WeightNotice weight={null} today={today} />
        );
      case "edit":
        return (
          <EditActivityContainer
            key={current.entry.id}
            entry={current.entry}
            activity={catalog.find((activity) => activity.id === current.entry.activityId) ?? null}
            weight={weight}
            onDone={close}
          />
        );
    }
  }

  return (
    <div className="flex flex-col gap-24">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          weight ? (
            <Button variant="primary" onClick={() => setPanel({ kind: "pick" })}>
              <Plus aria-hidden="true" size={18} />
              <span>{t.logActivity}</span>
            </Button>
          ) : null
        }
      />

      <DateNav
        date={date}
        today={today}
        basePath={BASE_PATH}
        onPick={(picked) => router.push(dayHref(BASE_PATH, picked, today))}
      />

      <WeightNotice weight={weight} today={today} />

      <ActivityDayView day={day} onEdit={(entry) => setPanel({ kind: "edit", entry })} />

      <Sheet
        open={panel !== null}
        onClose={close}
        title={panel?.kind === "edit" ? t.edit.title : t.add.title}
        closeLabel={t.add.close}
      >
        {panel ? renderPanel(panel) : null}
      </Sheet>
    </div>
  );
}
