import { LogOut } from "lucide-react";
import type { FormEvent } from "react";
import { buttonClassName } from "@/components/ui";
import { authStrings } from "../strings";

type SignOutButtonProps = {
  className?: string;
  action?: () => void | Promise<void>;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  pending?: boolean;
};

/** Presentational sign-out form. Submission comes from the container. */
export function SignOutButton({ className, action, onSubmit, pending = false }: SignOutButtonProps) {
  return (
    <form action={action} onSubmit={onSubmit} aria-busy={pending || undefined}>
      <button type="submit" disabled={pending} className={buttonClassName("ghost", className)}>
        <LogOut aria-hidden="true" size={18} />
        <span>{authStrings.signOut}</span>
      </button>
    </form>
  );
}
