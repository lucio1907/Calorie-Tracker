"use client";

import { useTransition, type FormEvent } from "react";
import { endSession, signOut } from "../actions/sign-out";
import { SignOutButton } from "../components/sign-out-button";

/**
 * Signs out, then loads /login as a new document so no client state of this
 * user (kept by the router in hidden <Activity> boundaries) reaches the next
 * account in the tab. `signOut` stays the form action for submits before
 * hydration.
 */
export function SignOutButtonContainer({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      await endSession();
      // A full document load is the point here (see the Next.js guide
      // "Preserving UI state", State and authentication); router.push would keep the state.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    });
  }

  return <SignOutButton className={className} action={signOut} onSubmit={handleSubmit} pending={pending} />;
}
