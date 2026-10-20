import type { Metadata } from "next";
import { PageTransition } from "@/components/ui";
import { SignOutButtonContainer } from "@/features/auth";
import { SettingsPage, settingsStrings } from "@/features/settings";

export const metadata: Metadata = { title: settingsStrings.title };

export default function SettingsRoute() {
  return (
    <PageTransition>
      <SettingsPage accountActions={<SignOutButtonContainer className="border border-border" />} />
    </PageTransition>
  );
}
