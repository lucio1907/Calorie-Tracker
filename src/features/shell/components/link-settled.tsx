"use client";

import { useLinkStatus } from "next/link";
import { useEffect, useRef } from "react";

/**
 * Render inside a <Link>: calls `onSettled` when that link's navigation stops
 * being pending (committed, cancelled or failed). A prefetched link may never
 * be pending; its navigation commits right away and changes the pathname.
 */
export function LinkSettled({ onSettled }: { onSettled?: () => void }) {
  const { pending } = useLinkStatus();
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending) onSettled?.();
    wasPending.current = pending;
  }, [pending, onSettled]);
  return null;
}
