import type { Metadata } from "next";
import { PageTransition } from "@/components/ui";
import { SignOutButton } from "@/features/auth";
import { SettingsPage, settingsStrings } from "@/features/settings";

export const metadata: Metadata = { title: settingsStrings.title };

export default function SettingsRoute() {
  return (
    <PageTransition>
      <SettingsPage accountActions={<SignOutButton className="border border-border" />} />
    </PageTransition>
  );
}
