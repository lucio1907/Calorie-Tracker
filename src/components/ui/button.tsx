import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "./cn";

type Variant = "primary" | "outline" | "ghost" | "danger";

// Press feedback: a slight scale (transform only, layout untouched) plus the hover fill on touch.
const base =
  "inline-flex min-h-44 items-center justify-center gap-8 rounded-buttons px-16 text-body font-medium transition-[color,background-color,border-color,transform] duration-150 ease-out motion-safe:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";

const variants: Record<Variant, string> = {
  // Filled brand CTA: one per surface.
  primary: "bg-action text-on-action shadow-subtle hover:bg-action-hover active:bg-action-hover",
  // Outlined Action Button: the workhorse secondary action.
  outline: "border border-border bg-surface text-ink hover:bg-surface-alt active:bg-surface-alt",
  ghost: "text-ink hover:bg-surface-alt active:bg-surface-alt",
  // Destructive confirmation; the label always says what happens (never color alone).
  danger: "border border-danger-ink bg-surface text-danger-ink hover:bg-danger-wash active:bg-danger-wash",
};

export function buttonClassName(variant: Variant = "outline", className?: string): string {
  return cn(base, variants[variant], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant };

export function Button({ variant = "outline", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant };

export function ButtonLink({ variant = "outline", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClassName(variant, className)} {...props} />;
}
