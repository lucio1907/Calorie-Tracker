import type { Metadata, Viewport } from "next";
import { bricolage, figtree } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s · Calorie Tracker",
    default: "Calorie Tracker",
  },
  description: "Personal calorie and macro tracker.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f5f0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${bricolage.variable}`}>
      <body>{children}</body>
    </html>
  );
}
