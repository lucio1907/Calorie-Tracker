import type { ReactNode } from "react";
import { authStrings } from "../strings";

/** Centered sign-in layout. The form is passed in as a slot. */
export function LoginScreen({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-alt px-16 py-48">
      <div className="flex w-full max-w-[400px] flex-col gap-24 rounded-largecards border border-border bg-surface p-24">
        <div className="flex flex-col gap-4">
          <p className="text-caption font-semibold tracking-wide text-ink-muted uppercase">{authStrings.appName}</p>
          <h1 className="text-heading-sm font-semibold text-ink">{authStrings.heading}</h1>
          <p className="text-body text-ink-muted">{authStrings.subheading}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
