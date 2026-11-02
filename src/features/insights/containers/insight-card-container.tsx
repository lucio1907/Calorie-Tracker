"use client";

import { useState, useTransition } from "react";
import type { ProgressRange } from "@/features/progress/lib/progress-range";
import { generateInsight } from "../actions/insight-actions";
import { InsightCard } from "../components/insight-card";
import type { Insight } from "../lib/insight-schema";
import type { InsightStats } from "../lib/insight-stats";

type InsightCardContainerProps = {
  range: ProgressRange;
  /** Today's stored summary for the range, read by the page; null when there is none yet. */
  initialInsight: Insight | null;
  /** The range's numbers, read by the page; null when they could not be read or nothing is logged. */
  stats: InsightStats | null;
};

/**
 * Generates the range's AI summary on demand. Render it keyed by range: each
 * range keeps its own state, so a summary or error for one never shows on
 * another. The result is stored server-side, so a reload shows it again.
 */
export function InsightCardContainer({ range, initialInsight, stats }: InsightCardContainerProps) {
  const [insight, setInsight] = useState(initialInsight);
  const [error, setError] = useState<string | null>(null);
  const [pending, startGenerate] = useTransition();

  function generate() {
    setError(null);
    startGenerate(async () => {
      const result = await generateInsight(range);
      if (result.ok) setInsight(result.data);
      else setError(result.error);
    });
  }

  return <InsightCard insight={insight} stats={stats} pending={pending} error={error} onGenerate={generate} />;
}
