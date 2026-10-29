import { cn } from "./cn";

type LogoProps = {
  /** Visible app name next to the mark. Omit for a mark-only logo. */
  wordmark?: string;
  className?: string;
  /** Sizes the mark (defaults to 32px). */
  markClassName?: string;
  wordmarkClassName?: string;
};

/**
 * App logo: a brand-green tile with a calorie progress ring whose end sprouts
 * a leaf, so the gauge also reads as a piece of fruit. The mark is decorative;
 * the wordmark (or the surrounding heading) carries the accessible name.
 * Same geometry as src/app/icon.svg, drawn with the theme tokens.
 */
export function Logo({ wordmark, className, markClassName, wordmarkClassName }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-8", className)}>
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={cn("size-32 shrink-0", markClassName)}>
        <rect width="64" height="64" rx="16" className="fill-brand" />
        <circle cx="31" cy="36" r="15" fill="none" strokeWidth="7" strokeOpacity=".24" className="stroke-canvas" />
        <path d="M31 51A15 15 0 1 1 34.12 21.33" fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-canvas" />
        <path transform="translate(34.12 21.33) rotate(-72)" d="M0 0C3.6 -8.8 13.5 -7.6 18 0C12.6 4.8 4.5 5.6 0 0Z" className="fill-canvas" />
      </svg>
      {wordmark ? <span className={wordmarkClassName}>{wordmark}</span> : null}
    </span>
  );
}
