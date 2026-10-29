import type { ReactNode } from "react";
import { Logo } from "@/components/ui";
import { shellStrings } from "../strings";

type AppShellProps = {
  sidebar: ReactNode;
  sidebarFooter?: ReactNode;
  tabBar: ReactNode;
  children: ReactNode;
};

const MAIN_ID = "main-content";

/**
 * App shell from design.md: fixed 240px sidebar on desktop (lg), icon rail on
 * tablet (md), bottom tab bar on mobile. Content is capped at 1200px.
 */
export function AppShell({ sidebar, sidebarFooter, tabBar, children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href={`#${MAIN_ID}`}
        className="sr-only focus:not-sr-only focus:fixed focus:top-8 focus:left-8 focus:z-20 focus:rounded-buttons focus:bg-surface focus:px-16 focus:py-12 focus:shadow-sm"
      >
        {shellStrings.skipToContent}
      </a>

      <aside className="fixed inset-y-0 left-0 z-10 hidden [view-transition-name:sidebar] w-72 flex-col justify-between border-r border-border bg-surface p-12 md:flex lg:w-240">
        <div className="flex flex-col gap-24">
          <div className="flex min-h-44 items-center gap-8 px-8 md:justify-center lg:justify-start">
            <Logo
              wordmark={shellStrings.appName}
              markClassName="size-28"
              wordmarkClassName="text-body-lg font-semibold text-ink md:sr-only lg:not-sr-only"
            />
          </div>
          {sidebar}
        </div>
        {sidebarFooter}
      </aside>

      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="px-16 pt-24 pb-[calc(104px+env(safe-area-inset-bottom))] outline-none md:pb-48 md:pl-[calc(72px+24px)] md:pr-24 lg:pl-[calc(240px+32px)] lg:pr-32"
      >
        <div className="mx-auto w-full max-w-page">{children}</div>
      </main>

      {tabBar}
    </div>
  );
}
