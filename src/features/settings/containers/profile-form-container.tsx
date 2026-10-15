"use client";

import { useActionState } from "react";
import type { CalendarDate } from "@/domain";
import { saveProfile } from "../actions/settings-actions";
import { ProfileForm } from "../components/profile-form";
import { initialProfileFormState, type ProfileFormValues } from "../lib/types";

type ProfileFormContainerProps = {
  defaults: ProfileFormValues;
  today: CalendarDate;
};

/** Wires ProfileForm to the saveProfile Server Action. */
export function ProfileFormContainer({ defaults, today }: ProfileFormContainerProps) {
  const [state, formAction, pending] = useActionState(saveProfile, initialProfileFormState);

  return <ProfileForm defaults={defaults} today={today} state={state} action={formAction} pending={pending} />;
}
