"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";

type Pending = { from: string; href: string };

type OptimisticPathname = {
  pathname: string;
  onNavigate: (href: string) => void;
  onSettled: (href: string) => void;
};

/**
 * The pathname the navigation should mark as current. usePathname() only
 * changes once the destination commits, so an unprefetched navigation (or a
 * slow server) leaves the old tab marked for a moment. Pass `onNavigate` to
 * each <Link>'s onNavigate: the clicked destination is marked right away,
 * and any change of the real pathname (the commit, back/forward, a redirect)
 * takes over again. `onSettled` is for a navigation to `href` that ended
 * without leaving the page (cancelled or failed): the real pathname shows again.
 */
export function useOptimisticPathname(): OptimisticPathname {
  const actual = usePathname();
  const [pending, setPending] = useState<Pending | null>(null);
  const onNavigate = useCallback((href: string) => setPending({ from: actual, href }), [actual]);
  const onSettled = useCallback((href: string) => setPending((current) => (current?.href === href ? null : current)), []);
  return { pathname: pending?.from === actual ? pending.href : actual, onNavigate, onSettled };
}
