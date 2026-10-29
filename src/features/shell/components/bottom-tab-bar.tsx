import { Plus } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { cn, PAGE_TRANSITION } from "@/components/ui";
import { isActive, type NavItem } from "../nav-items";
import { LinkSettled } from "./link-settled";
import { shellStrings } from "../strings";

type BottomTabBarProps = {
  leading: readonly NavItem[];
  trailing: readonly NavItem[];
  logHref: string;
  pathname: string;
  /** Called on a client navigation to `href` (marks the tab before the route commits). */
  onNavigate?: (href: string) => void;
  /** Called when the navigation to `href` is no longer pending. */
  onSettled?: (href: string) => void;
  /** Click on the center log action; preventDefault() cancels its navigation. */
  onLogClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

type TabLinkProps = Pick<BottomTabBarProps, "pathname" | "onNavigate" | "onSettled"> & { item: NavItem };

function TabLink({ item, pathname, onNavigate, onSettled }: TabLinkProps) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <li className="flex-1">
      <Link
        href={item.href}
        transitionTypes={[PAGE_TRANSITION]}
        onNavigate={() => onNavigate?.(item.href)}
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
        <LinkSettled onSettled={onSettled ? () => onSettled(item.href) : undefined} />
      </Link>
    </li>
  );
}

/** Mobile (< md) bottom tab bar with the filled brand "+ Log" CTA in the center. */
export function BottomTabBar({ leading, trailing, logHref, pathname, onNavigate, onSettled, onLogClick }: BottomTabBarProps) {
  return (
    <nav
      aria-label={shellStrings.tabBarNav}
      // Stays on top and still while page content transitions (see globals.css).
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] [view-transition-name:tab-bar] md:hidden"
    >
      {/* Even gaps and some vertical room keep the five targets apart on narrow phones. */}
      <ul className="mx-auto flex max-w-[560px] items-center gap-4 px-12 py-8">
        {leading.map((item) => (
          <TabLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} onSettled={onSettled} />
        ))}
        <li className="flex flex-1 justify-center">
          <Link
            href={logHref}
            transitionTypes={[PAGE_TRANSITION]}
            onClick={onLogClick}
            onNavigate={() => onNavigate?.(logHref)}
            aria-label={shellStrings.logAccessible}
            className="flex min-h-48 min-w-48 items-center justify-center gap-4 rounded-full bg-action px-14 text-body font-medium text-on-action shadow-subtle transition-[background-color,transform] duration-150 ease-out active:bg-action-hover motion-safe:active:scale-95"
          >
            <Plus aria-hidden="true" size={18} />
            <span>{shellStrings.log}</span>
            <LinkSettled onSettled={onSettled ? () => onSettled(logHref) : undefined} />
          </Link>
        </li>
        {trailing.map((item) => (
          <TabLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} onSettled={onSettled} />
        ))}
      </ul>
    </nav>
  );
}
