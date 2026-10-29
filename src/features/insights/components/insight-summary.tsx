import type { Insight } from "../lib/insight-schema";
import { insightsStrings as t } from "../strings";

type HeadingLevel = 3 | 4;

type InsightSummaryProps = {
  insight: Insight;
  /** Prefix of the section heading ids; unique per summary on the page. */
  idPrefix: string;
  /** Level of the overview / wins / improvements headings (one below the summary's own title). */
  headingLevel: HeadingLevel;
};

function Heading({ level, id, children }: { level: HeadingLevel; id?: string; children: string }) {
  const Tag = level === 3 ? "h3" : "h4";
  return (
    <Tag id={id} className="text-body font-semibold text-ink">
      {children}
    </Tag>
  );
}

function Section({ id, heading, items, level }: { id: string; heading: string; items: readonly string[]; level: HeadingLevel }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-8">
      <Heading level={level} id={id}>
        {heading}
      </Heading>
      <ul aria-labelledby={id} className="flex list-disc flex-col gap-4 pl-20 text-body text-ink">
        {items.map((item, index) => (
          <li key={index} className="break-words">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A summary's overview, wins and improvements (empty sections are left out). */
export function InsightSummary({ insight, idPrefix, headingLevel }: InsightSummaryProps) {
  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-col gap-8">
        <Heading level={headingLevel}>{t.overview}</Heading>
        <p className="text-body break-words text-ink">{insight.overview}</p>
      </div>
      <Section id={`${idPrefix}-wins`} heading={t.wins} items={insight.wins} level={headingLevel} />
      <Section id={`${idPrefix}-improvements`} heading={t.improvements} items={insight.improvements} level={headingLevel} />
    </div>
  );
}
