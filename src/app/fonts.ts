import { Geist_Mono, Inter } from "next/font/google";

/** Body/UI font and, as the Satoshi substitute, display font (see theme.css). */
export const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter-next",
  display: "swap",
});

/** Numeric values (kcal, grams, macros, weight) with tabular figures. */
export const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono-next",
  display: "swap",
});
