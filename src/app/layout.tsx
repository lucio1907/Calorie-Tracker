import type { Metadata, Viewport } from "next";
import { bricolage, figtree } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s · Contador de calorías",
    default: "Contador de calorías",
  },
  description: "Contador personal de calorías y macros.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f5f0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${figtree.variable} ${bricolage.variable}`}>
      <body>{children}</body>
    </html>
  );
}
