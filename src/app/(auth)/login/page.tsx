import type { Metadata } from "next";
import { Suspense } from "react";
import { authStrings, initialSignInState, LoginForm, LoginFormContainer, LoginScreen } from "@/features/auth";

export const metadata: Metadata = { title: authStrings.pageTitle };

export default function LoginRoute() {
  return (
    <LoginScreen>
      {/* The container reads ?next= from the URL, which is request data. */}
      <Suspense fallback={<LoginForm state={initialSignInState} disabled />}>
        <LoginFormContainer />
      </Suspense>
    </LoginScreen>
  );
}
