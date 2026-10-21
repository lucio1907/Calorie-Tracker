import type { Metadata } from "next";
import { Suspense } from "react";
import {
  authStrings,
  initialVerifyState,
  LoginScreen,
  SecondFactorGate,
  SignOutButtonContainer,
  VerifyForm,
  VerifyFormContainer,
} from "@/features/auth";

export const metadata: Metadata = { title: authStrings.verify.pageTitle };

export default function VerifyRoute({ searchParams }: PageProps<"/login/verify">) {
  return (
    <LoginScreen heading={authStrings.verify.heading} subheading={authStrings.verify.subheading}>
      <Suspense fallback={null}>
        <SecondFactorGate searchParams={searchParams} />
      </Suspense>
      {/* The container reads ?next= from the URL, which is request data. */}
      <Suspense fallback={<VerifyForm state={initialVerifyState} disabled />}>
        <VerifyFormContainer />
      </Suspense>
      <div className="flex flex-col items-start gap-4 border-t border-border pt-16">
        <p className="text-body text-ink-muted">{authStrings.verify.signOutHint}</p>
        <SignOutButtonContainer className="border border-border" />
      </div>
    </LoginScreen>
  );
}
