"use client";

import type { ComponentProps } from "react";
import { AnimatedNumber } from "@/components/ui";
import { formatAmount, formatKcal } from "@/features/foods/lib/format";

const FORMATS = { kcal: formatKcal, amount: formatAmount };

type TodayNumberProps = Omit<ComponentProps<typeof AnimatedNumber>, "format"> & { format: keyof typeof FORMATS };

/**
 * AnimatedNumber with a format picked by name: functions cannot be passed from
 * a Server Component, so only this wrapper ships to the client, not the view.
 */
export function TodayNumber({ format, ...props }: TodayNumberProps) {
  return <AnimatedNumber {...props} format={FORMATS[format]} />;
}
