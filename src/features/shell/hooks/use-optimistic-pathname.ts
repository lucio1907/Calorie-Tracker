"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";

type Pending = { from: string; href: string };

/**
 * The pathname the navigation should mark as current. usePathname() only
 * changes once the destination commits, so an unprefetched navigation (or a
 * slow server) leaves the old tab marked for a moment. Pass `onNavigate` to
 * each <Link>'s onNavigate: the clicked destination is marked right away,
 * and any change of the real pathname (the commit, back/forward, a redirect)
 * takes over again.
 */
export function useOptimisticPathname(): { pathname: string; onNavigate: (href: string) => void } {
  const actual = usePathname();
  const [pending, setPending] = useState<Pending | null>(null);
  const onNavigate = useCallback((href: string) => setPending({ from: actual, href }), [actual]);
  return { pathname: pending?.from === actual ? pending.href : actual, onNavigate };
}
