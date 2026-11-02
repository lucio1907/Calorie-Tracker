import { Activity, BookOpen, ChartLine, House, Salad, Settings, Sparkles, type LucideIcon } from "lucide-react";
import { insightsStrings } from "@/features/insights/strings";
import { shellStrings } from "./strings";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Sidebar destinations (desktop and tablet), in display order. */
export const SIDEBAR_ITEMS: readonly NavItem[] = [
  { href: "/today", label: shellStrings.nav.today, icon: House },
  { href: "/diary", label: shellStrings.nav.diary, icon: BookOpen },
  { href: "/activity", label: shellStrings.nav.activity, icon: Activity },
  { href: "/foods", label: shellStrings.nav.foods, icon: Salad },
  { href: "/progress", label: shellStrings.nav.progress, icon: ChartLine },
  { href: "/insights", label: insightsStrings.nav, icon: Sparkles },
  { href: "/settings", label: shellStrings.nav.settings, icon: Settings },
];

function byHref(href: string): NavItem {
  const item = SIDEBAR_ITEMS.find((candidate) => candidate.href === href);
  if (!item) throw new Error(`No sidebar item for ${href}`);
  return item;
}

/**
 * Mobile tab bar: two tabs, the center "+ Log" action, one tab and "More"
 * (Today, Diary · Progress, More). Every other sidebar destination lives in
 * the More sheet, so mobile reaches all of them.
 */
export const TAB_BAR_LEADING: readonly NavItem[] = [byHref("/today"), byHref("/diary")];
export const TAB_BAR_TRAILING: readonly NavItem[] = [byHref("/progress")];
export const TAB_BAR_MORE: readonly NavItem[] = SIDEBAR_ITEMS.filter(
  (item) => !TAB_BAR_LEADING.includes(item) && !TAB_BAR_TRAILING.includes(item),
);

/** Logging starts in the diary (today's day, then pick a meal and a food). */
export const LOG_HREF = "/diary";

/**
 * Window event the "+ Log" action dispatches when the diary is already on
 * screen (a link to the same page would do nothing): the diary opens its
 * add-food sheet instead.
 */
export const LOG_FOOD_EVENT = "shell:log-food";

/** True when `pathname` is the item's route or one of its children. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
