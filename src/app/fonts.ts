import { Bricolage_Grotesque, Figtree } from "next/font/google";

/**
 * Body/UI font; also numbers, with tabular figures (see the `tabular`
 * utility). Figtree rather than DM Sans: Google's DM Sans has no `tnum`.
 */
export const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  variable: "--font-figtree-next",
  display: "swap",
});

/** Display font for headings and big numbers (see `display-text`). */
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bricolage-next",
  display: "swap",
});
