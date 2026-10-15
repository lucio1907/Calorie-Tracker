"use client";

import { usePathname } from "next/navigation";
import { BottomTabBar } from "../components/bottom-tab-bar";
import { LOG_HREF, TAB_BAR_LEADING, TAB_BAR_TRAILING } from "../nav-items";

export function BottomTabBarContainer() {
  return (
    <BottomTabBar leading={TAB_BAR_LEADING} trailing={TAB_BAR_TRAILING} logHref={LOG_HREF} pathname={usePathname()} />
  );
}
