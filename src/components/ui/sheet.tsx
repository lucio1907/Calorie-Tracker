"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { UNSAFE_PortalProvider } from "react-aria";

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
 * Popovers opened inside (selects, calendars) portal into the dialog: anything
 * outside an open modal dialog is inert and drawn below it.
 */
export function Sheet({ open, onClose, title, closeLabel, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const portalContainer = useCallback(() => ref.current, []);

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
        // The backdrop belongs to the dialog element, so a backdrop click
        // targets it, but so does a click whose press and release land on
        // different children (e.g. a select popover opening between them):
        // only a pointer outside the panel's box closes the sheet.
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        const inside =
          event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
        if (!inside) onClose();
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
          <UNSAFE_PortalProvider getContainer={portalContainer}>{children}</UNSAFE_PortalProvider>
        </div>
      </div>
    </dialog>
  );
}
