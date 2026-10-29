"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type DialogProps = {
  open: boolean;
  /** Esc (the native close) dismisses; the caller decides what that means. */
  onClose: () => void;
  title: string;
  description?: string;
  /** The choices, as buttons; the first one gets focus. */
  children: ReactNode;
};

/**
 * Small centered modal for a quick question, on a native <dialog> (focus trap,
 * Esc and focus return come from the browser). It can open on top of a Sheet:
 * modal dialogs stack in the top layer. Unlike Sheet, a backdrop click does
 * nothing, so a stray tap never picks an answer.
 */
export function Dialog({ open, onClose, title, description, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      className="dialog-motion m-auto w-[calc(100%-32px)] max-w-400 rounded-largecards border border-border bg-surface p-24 text-ink backdrop:bg-ink-strong/40"
    >
      <div className="flex flex-col gap-16">
        <div className="flex flex-col gap-8">
          <h2 id={titleId} className="text-body-xl font-semibold text-ink">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="text-body text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-8 sm:flex-row sm:justify-end">{children}</div>
      </div>
    </dialog>
  );
}
