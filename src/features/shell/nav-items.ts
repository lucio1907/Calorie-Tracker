import { Activity, BookOpen, ChartLine, House, Salad, Settings, type LucideIcon } from "lucide-react";
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
  { href: "/settings", label: shellStrings.nav.settings, icon: Settings },
];

/** Mobile tab bar: two items, the center "+ Log" action, two items. */
export const TAB_BAR_LEADING: readonly NavItem[] = [SIDEBAR_ITEMS[0], SIDEBAR_ITEMS[1]];
export const TAB_BAR_TRAILING: readonly NavItem[] = [SIDEBAR_ITEMS[4], SIDEBAR_ITEMS[5]];

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
