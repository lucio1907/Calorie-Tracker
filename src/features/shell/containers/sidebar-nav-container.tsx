"use client";

import { SidebarNav } from "../components/sidebar-nav";
import { useOptimisticPathname } from "../hooks/use-optimistic-pathname";
import { SIDEBAR_ITEMS } from "../nav-items";

export function SidebarNavContainer() {
  const { pathname, onNavigate } = useOptimisticPathname();
  return <SidebarNav items={SIDEBAR_ITEMS} pathname={pathname} onNavigate={onNavigate} />;
}
