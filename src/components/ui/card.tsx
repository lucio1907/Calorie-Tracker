import type { ComponentProps } from "react";
import { cn } from "./cn";

/** Dashboard Card: white, 1px hairline border, 20px radius, no shadow. */
export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-cards border border-border bg-surface p-16", className)} {...props} />;
}
