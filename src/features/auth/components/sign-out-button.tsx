import { LogOut } from "lucide-react";
import { buttonClassName } from "@/components/ui";
import { signOut } from "../actions/sign-out";
import { authStrings } from "../strings";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOut}>
      <button type="submit" className={buttonClassName("ghost", className)}>
        <LogOut aria-hidden="true" size={18} />
        <span>{authStrings.signOut}</span>
      </button>
    </form>
  );
}
