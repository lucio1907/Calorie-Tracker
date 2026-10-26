"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, PageHeader, Sheet } from "@/components/ui";
import type { CalendarDate } from "@/domain";
import { CalorieHistoryView } from "../components/calorie-history-view";
import { RangeNav } from "../components/range-nav";
import { WeightChart } from "../components/weight-chart";
import { WeightEntryList, type WeightLogRow } from "../components/weight-entry-list";
import type { CalorieHistory } from "../lib/calorie-history";
import { formatKg } from "../lib/format";
import type { ProgressRange } from "../lib/progress-range";
import type { WeightEntry } from "../lib/types";
import type { WeightTrend } from "../lib/weight-trend";
import { progressStrings as t } from "../strings";
import { AddWeightContainer, EditWeightContainer } from "./weight-entry-containers";

type Panel = { kind: "add" } | { kind: "edit"; entry: WeightEntry };

type ProgressScreenContainerProps = {
  today: CalendarDate;
  range: ProgressRange;
  from: CalendarDate;
  to: CalendarDate;
  trend: WeightTrend;
  log: WeightLogRow[];
  /** Latest weight on or before today (prefills "Log weight"); null when none. */
  latestKg: number | null;
  history: CalorieHistory;
};

/**
 * Progress screen: range selector, weight trend chart, the weight log (each
 * entry opens the editor) and the daily calorie balance history, plus the
 * sheet hosting the log / edit weight forms. Mutations refresh the
 * server-rendered screen in the same round trip.
 */
export function ProgressScreenContainer({
  today,
  range,
  from,
  to,
  trend,
  log,
  latestKg,
  history,
}: ProgressScreenContainerProps) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const close = useCallback(() => setPanel(null), []);

  return (
    <div className="stagger flex flex-col gap-24">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button variant="primary" onClick={() => setPanel({ kind: "add" })}>
            <Plus aria-hidden="true" size={18} />
            <span>{t.logWeight}</span>
          </Button>
        }
      />

      <RangeNav range={range} />

      <div className="grid gap-16 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <WeightChart trend={trend} from={from} to={to} rangeDays={range} />
        <WeightEntryList rows={log} today={today} onEdit={(entry) => setPanel({ kind: "edit", entry })} />
      </div>

      <CalorieHistoryView history={history} />

      <Sheet
        open={panel !== null}
        onClose={close}
        title={panel?.kind === "edit" ? t.form.editTitle : t.form.addTitle}
        closeLabel={t.form.close}
      >
        {panel?.kind === "add" ? (
          <AddWeightContainer today={today} defaultKg={latestKg === null ? "" : formatKg(latestKg)} onSaved={close} />
        ) : panel?.kind === "edit" ? (
          <EditWeightContainer key={panel.entry.id} entry={panel.entry} today={today} onDone={close} />
        ) : null}
      </Sheet>
    </div>
  );
}
