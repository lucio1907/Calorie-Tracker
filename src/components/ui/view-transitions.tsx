import { ViewTransition, type ReactNode } from "react";

/*
 * React <ViewTransition> wrappers. Animations only run inside transitions
 * (here: navigations) and only for the transition types
 * below; the keyframes live in app/globals.css and are skipped under
 * prefers-reduced-motion. Without View Transitions support nothing animates.
 */

/** Tab bar / sidebar navigation between sections. */
export const PAGE_TRANSITION = "nav-page";
/** Moving to a later / earlier day on a day-based screen. */
export const DAY_FORWARD = "day-forward";
export const DAY_BACK = "day-back";

/** Transition type for going from day `from` to day `to` (YYYY-MM-DD strings compare as dates). */
export function dayTransitionType(from: string, to: string): string {
  return to > from ? DAY_FORWARD : DAY_BACK;
}

/** A section's content: fades out / rises in when the tab bar or sidebar switches sections. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ [PAGE_TRANSITION]: "page-enter", default: "none" }}
      exit={{ [PAGE_TRANSITION]: "page-exit", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

/**
 * One day of a day-based screen: a later day slides in from the right, an
 * earlier one from the left. Give it key={date} so a new ?date= swaps the
 * old day out and the new one in (the page itself persists across ?date=).
 */
export function DayTransition({ children }: { children: ReactNode }) {
  const slide = { [DAY_FORWARD]: DAY_FORWARD, [DAY_BACK]: DAY_BACK, default: "none" };
  return (
    <ViewTransition enter={slide} exit={slide} default="none">
      {children}
    </ViewTransition>
  );
}

/**
 * Content that stays put while its page slides to another day (the title
 * and the date navigation): the old and new copies share `name`, and the
 * "anchored" class turns their animation off (see globals.css). Names must
 * be unique on the page.
 */
export function AnchoredTransition({ name, children }: { name: string; children: ReactNode }) {
  return (
    <ViewTransition name={name} share="anchored" default="none">
      {children}
    </ViewTransition>
  );
}
