"use client";

import { usePathname } from "next/navigation";
import { SidebarNav } from "../components/sidebar-nav";
import { SIDEBAR_ITEMS } from "../nav-items";

export function SidebarNavContainer() {
  return <SidebarNav items={SIDEBAR_ITEMS} pathname={usePathname()} />;
}
