"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";

type SearchParamsSuspenseProps = {
  fallback: ReactNode;
  children: ReactNode;
};

/**
 * A <Suspense> boundary that starts over whenever the URL's search params
 * change. Use it in the layout right above a page that reads them (?date=,
 * ?range=).
 *
 * When only the search params change, the page segment stays mounted and
 * waits for the server as a whole, and an already revealed boundary above it
 * keeps the old page on screen during the navigation transition. Keying the
 * boundary by the search params makes it a new boundary, whose fallback
 * renders right away.
 *
 * useSearchParams() suspends while prerendering, so the outer boundary puts
 * the same fallback in the static shell.
 */
export function SearchParamsSuspense({ fallback, children }: SearchParamsSuspenseProps) {
  return (
    <Suspense fallback={fallback}>
      <KeyedBySearchParams fallback={fallback}>{children}</KeyedBySearchParams>
    </Suspense>
  );
}

function KeyedBySearchParams({ fallback, children }: SearchParamsSuspenseProps) {
  const search = useSearchParams().toString();
  return (
    <Suspense key={search} fallback={fallback}>
      {children}
    </Suspense>
  );
}
