"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
};

/**
 * Modal panel on a native <dialog> (focus trap, Esc to close and focus return
 * come from the browser). Bottom sheet on mobile, right-hand panel from md up.
 */
export function Sheet({ open, onClose, title, closeLabel, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none rounded-t-largecards border border-border bg-surface p-0 text-ink backdrop:bg-ink-strong/40 md:inset-y-0 md:left-auto md:right-0 md:h-dvh md:max-h-dvh md:w-440 md:rounded-none md:border-y-0 md:border-r-0"
    >
      <div className="flex max-h-[90dvh] flex-col md:h-full md:max-h-none">
        <header className="flex items-center justify-between gap-12 border-b border-border py-8 pr-8 pl-16">
          <h2 id={titleId} className="min-w-0 truncate text-body-xl font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="inline-flex size-44 shrink-0 items-center justify-center rounded-buttons text-ink hover:bg-surface-alt"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>
        <div className="overflow-y-auto overscroll-contain px-16 pt-16 pb-[calc(24px+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </dialog>
  );
}
