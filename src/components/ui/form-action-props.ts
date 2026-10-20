import { startTransition, type FormEvent } from "react";

type FormAction = (formData: FormData) => void | Promise<void>;

/**
 * Props that run a form's action without React's post-action form reset.
 *
 * React resets a form after its `action` runs, and React Aria answers that
 * reset by restoring each Select/DatePicker to its page-load value, so a
 * submit would undo the choices still on screen (and a failed one would send
 * them wrong next time). Submitting through a transition skips the reset;
 * `action` stays on the form for submits before hydration.
 */
export function formActionProps(action: FormAction | undefined) {
  return {
    action,
    onSubmit(event: FormEvent<HTMLFormElement>) {
      if (!action) return;
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      startTransition(() => action(formData));
    },
  };
}
