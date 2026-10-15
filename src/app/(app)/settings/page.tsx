import type { Metadata } from "next";
import { SignOutButton } from "@/features/auth";
import { SettingsPage, settingsStrings } from "@/features/settings";

export const metadata: Metadata = { title: settingsStrings.title };

export default function SettingsRoute() {
  return <SettingsPage accountActions={<SignOutButton className="border border-border" />} />;
}
