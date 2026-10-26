import { Suspense, type ReactNode } from "react";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/features/auth/data/current-user";
import { PageSkeleton } from "@/features/shell";
import { appToday } from "@/lib/app-time";
import { requestNow } from "@/lib/request-time";
import { ProfileFormContainer } from "../containers/profile-form-container";
import { TwoFactorContainer } from "../containers/two-factor-container";
import { WeightFormContainer } from "../containers/weight-form-container";
import { getLatestWeight, getStoredProfile } from "../data/settings";
import { getVerifiedTotpFactorId } from "../data/two-factor";
import { profileFormDefaults } from "../lib/profile-schema";
import { latestWeightText } from "../lib/weight-entry";
import { settingsStrings as s } from "../strings";

type SettingsPageProps = {
  /** Account actions (e.g. sign out), injected by the route. */
  accountActions: ReactNode;
};

/**
 * Settings route content: today's weight, the profile the daily target is
 * computed from, two-factor authentication, and account actions (sign out
 * lives here for mobile users).
 * The heading and account actions are static and land in the shell; only
 * the cards that read the caller's data wait behind <Suspense>.
 */
export function SettingsPage({ accountActions }: SettingsPageProps) {
  return (
    <div className="stagger flex flex-col gap-24">
      <PageHeader title={s.title} description={s.description} />

      <Suspense fallback={<PageSkeleton />}>
        <SettingsCards />
      </Suspense>

      <Card aria-labelledby="settings-account" className="flex flex-col items-start gap-8">
        <h2 id="settings-account" className="text-body font-semibold text-ink">
          {s.accountHeading}
        </h2>
        {accountActions}
      </Card>
    </div>
  );
}

/** The weight, profile and two-factor cards. Reads per request: must render inside <Suspense>. */
async function SettingsCards() {
  const [now, user] = await Promise.all([requestNow(), requireUser()]);
  const today = appToday(now);
  const [profile, latestWeight, totpFactorId] = await Promise.all([
    getStoredProfile(user.id),
    getLatestWeight(user.id, today),
    getVerifiedTotpFactorId(),
  ]);

  return (
    <>
      <Card aria-labelledby="settings-weight" className="flex flex-col gap-12">
        <div className="flex flex-col gap-4">
          <h2 id="settings-weight" className="text-body font-semibold text-ink">
            {s.weight.heading}
          </h2>
          <p className="tabular text-body text-ink-muted">{latestWeightText(latestWeight, today)}</p>
        </div>
        <WeightFormContainer />
      </Card>

      <Card aria-labelledby="settings-profile" className="flex flex-col gap-16">
        <div className="flex flex-col gap-4">
          <h2 id="settings-profile" className="text-body font-semibold text-ink">
            {s.profile.heading}
          </h2>
          <p className="text-body text-ink-muted">{s.profile.description}</p>
        </div>
        <ProfileFormContainer
          defaults={profileFormDefaults(profile)}
          today={today}
          weightKg={latestWeight?.kg ?? null}
        />
      </Card>

      <Card aria-labelledby="settings-two-factor" className="flex flex-col gap-12">
        <div className="flex flex-col gap-4">
          <h2 id="settings-two-factor" className="text-body font-semibold text-ink">
            {s.twoFactor.heading}
          </h2>
          <p className="text-body text-ink-muted">{totpFactorId ? s.twoFactor.on : s.twoFactor.off}</p>
        </div>
        <TwoFactorContainer factorId={totpFactorId} />
      </Card>
    </>
  );
}
