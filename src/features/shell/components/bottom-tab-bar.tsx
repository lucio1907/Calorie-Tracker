import { Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/ui";
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
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-56 flex-col items-center justify-center gap-4 rounded-buttons text-caption font-medium",
          active ? "text-brand" : "text-ink-muted",
        )}
      >
        <Icon aria-hidden="true" size={22} />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}

/** Mobile (< md) bottom tab bar with the Filled Dark "+ Log" CTA in the center. */
export function BottomTabBar({ leading, trailing, logHref, pathname }: BottomTabBarProps) {
  return (
    <nav
      aria-label={shellStrings.tabBarNav}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex max-w-[480px] items-center px-8">
        {leading.map((item) => (
          <TabLink key={item.href} item={item} pathname={pathname} />
        ))}
        <li className="flex flex-1 justify-center">
          <Link
            href={logHref}
            aria-label={shellStrings.logAccessible}
            className="flex min-h-44 min-w-44 items-center justify-center gap-4 rounded-full bg-action px-16 text-body font-medium text-on-action shadow-subtle"
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
