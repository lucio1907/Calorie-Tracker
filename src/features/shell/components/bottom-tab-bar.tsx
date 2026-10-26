import { Plus } from "lucide-react";
import Link from "next/link";
import { cn, PAGE_TRANSITION } from "@/components/ui";
import { isActive, type NavItem } from "../nav-items";
import { shellStrings } from "../strings";

type BottomTabBarProps = {
  leading: readonly NavItem[];
  trailing: readonly NavItem[];
  logHref: string;
  pathname: string;
};

function TabLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <li className="flex-1">
      <Link
        href={item.href}
        transitionTypes={[PAGE_TRANSITION]}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-56 flex-col items-center justify-center gap-4 rounded-buttons text-caption transition-[color,transform] duration-150 ease-out motion-safe:active:scale-95",
          active ? "font-semibold text-brand" : "font-medium text-ink-muted",
        )}
      >
        {/* The pill mounts with the active tab, so it grows in on each navigation. */}
        {active ? (
          <span className="rounded-full bg-nav-active px-14 py-4 transition-[opacity,scale] duration-200 ease-enter starting:scale-x-60 starting:opacity-0">
            <Icon aria-hidden="true" size={22} />
          </span>
        ) : (
          <Icon aria-hidden="true" size={22} className="my-4" />
        )}
        <span>{item.label}</span>
      </Link>
    </li>
  );
}

/** Mobile (< md) bottom tab bar with the filled brand "+ Log" CTA in the center. */
export function BottomTabBar({ leading, trailing, logHref, pathname }: BottomTabBarProps) {
  return (
    <nav
      aria-label={shellStrings.tabBarNav}
      // Stays on top and still while page content transitions (see globals.css).
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] [view-transition-name:tab-bar] md:hidden"
    >
      <ul className="mx-auto flex max-w-[480px] items-center px-8">
        {leading.map((item) => (
          <TabLink key={item.href} item={item} pathname={pathname} />
        ))}
        <li className="flex flex-1 justify-center">
          <Link
            href={logHref}
            transitionTypes={[PAGE_TRANSITION]}
            aria-label={shellStrings.logAccessible}
            className="flex min-h-48 min-w-48 items-center justify-center gap-4 rounded-full bg-action px-16 text-body font-medium text-on-action shadow-subtle transition-[background-color,transform] duration-150 ease-out active:bg-action-hover motion-safe:active:scale-95"
          >
            <Plus aria-hidden="true" size={18} />
            <span>{shellStrings.log}</span>
          </Link>
        </li>
        {trailing.map((item) => (
          <TabLink key={item.href} item={item} pathname={pathname} />
        ))}
      </ul>
    </nav>
  );
}
