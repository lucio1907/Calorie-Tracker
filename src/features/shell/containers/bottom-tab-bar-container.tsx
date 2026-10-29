"use client";

import { usePathname } from "next/navigation";
import { BottomTabBar } from "../components/bottom-tab-bar";
import { useOptimisticPathname } from "../hooks/use-optimistic-pathname";
import { isActive, LOG_FOOD_EVENT, LOG_HREF, TAB_BAR_LEADING, TAB_BAR_TRAILING } from "../nav-items";

export function BottomTabBarContainer() {
  const actual = usePathname();
  const { pathname, onNavigate, onSettled } = useOptimisticPathname();
  return (
    <BottomTabBar
      leading={TAB_BAR_LEADING}
      trailing={TAB_BAR_TRAILING}
      logHref={LOG_HREF}
      pathname={pathname}
      onNavigate={onNavigate}
      onSettled={onSettled}
      onLogClick={(event) => {
        // A link to the page already on screen would do nothing: open the add-food sheet instead.
        if (!isActive(actual, LOG_HREF)) return;
        event.preventDefault();
        window.dispatchEvent(new Event(LOG_FOOD_EVENT));
      }}
    />
  );
}
