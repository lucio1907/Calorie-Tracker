import Link from "next/link";
import { cn, PAGE_TRANSITION } from "@/components/ui";
import { isActive, type NavItem } from "../nav-items";
import { shellStrings } from "../strings";

type SidebarNavProps = {
  items: readonly NavItem[];
  pathname: string;
  /** Called on a client navigation to `href` (marks the item before the route commits). */
  onNavigate?: (href: string) => void;
};

/**
 * Sidebar Nav Items. Tablet (md): icon rail with visually hidden labels.
 * Desktop (lg): icon + label. Active item uses the soft blue fill.
 */
export function SidebarNav({ items, pathname, onNavigate }: SidebarNavProps) {
  return (
    <nav aria-label={shellStrings.primaryNav}>
      <ul className="flex flex-col gap-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                transitionTypes={[PAGE_TRANSITION]}
                onNavigate={() => onNavigate?.(href)}
                aria-current={active ? "page" : undefined}
                title={label}
                className={cn(
                  "flex min-h-44 items-center gap-12 rounded-buttons px-12 py-12 text-body font-medium text-ink transition-[background-color,transform] duration-150 ease-out motion-safe:active:scale-[0.98] md:justify-center lg:justify-start lg:px-8",
                  active ? "bg-nav-active" : "hover:bg-surface-alt",
                )}
              >
                <Icon aria-hidden="true" size={20} className={active ? "text-brand" : "text-ink-muted"} />
                <span className="md:sr-only lg:not-sr-only">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
