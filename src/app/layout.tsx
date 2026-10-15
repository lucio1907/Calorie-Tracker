import type { Metadata, Viewport } from "next";
import { geistMono, inter } from "./fonts";
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
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
