// Client-safe exports only: server reads live in ./data (server-only) and are imported directly.
export { InsightCardContainer } from "./containers/insight-card-container";
export type { Insight } from "./lib/insight-schema";
export type { InsightStats } from "./lib/insight-stats";
export { insightsHref } from "./lib/insights-href";
export { insightsStrings } from "./strings";
