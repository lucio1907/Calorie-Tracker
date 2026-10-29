import type { ReactNode } from "react";
import { Logo } from "@/components/ui";
import { authStrings } from "../strings";

type LoginScreenProps = {
  children: ReactNode;
  heading?: string;
  subheading?: string;
};

/** Centered sign-in layout. The form is passed in as a slot. */
export function LoginScreen({ children, heading = authStrings.heading, subheading = authStrings.subheading }: LoginScreenProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-alt px-16 py-48">
      <div className="flex w-full max-w-[400px] flex-col gap-24 rounded-largecards border border-border bg-surface p-24">
        <div className="flex flex-col gap-4">
          <Logo markClassName="mb-12 size-44" />
          <p className="text-caption font-semibold tracking-wide text-ink-muted uppercase">{authStrings.appName}</p>
          <h1 className="text-heading-sm font-semibold text-ink">{heading}</h1>
          <p className="text-body text-ink-muted">{subheading}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
