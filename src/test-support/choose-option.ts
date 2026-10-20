import { screen, waitFor } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { expect } from "vitest";

/** Picks `option` in the custom Select labelled `label` (the replacement for user.selectOptions). */
export async function chooseOption(user: UserEvent, label: string, option: string): Promise<void> {
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByRole("option", { name: option }));
  await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
}

/** The form's submitted fields, as the Server Action would receive them. */
export function formValues(form: HTMLFormElement | null): Record<string, FormDataEntryValue> {
  if (!form) throw new Error("form not found");
  return Object.fromEntries(new FormData(form));
}
