import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./dialog";

// jsdom has no modal dialogs: open/close the <dialog> by toggling its attribute.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute("open");
};

describe("Dialog", () => {
  it("opens as a labelled, described dialog with its actions", () => {
    render(
      <Dialog open onClose={vi.fn()} title="Saved" description="Add another one?">
        <button type="button">Yes</button>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Saved" });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleDescription("Add another one?");
    expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument();
  });

  it("reports Esc (the native close) as a dismissal", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Saved">
        <button type="button">Yes</button>
      </Dialog>,
    );

    fireEvent(screen.getByRole("dialog"), new Event("close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays closed while not open", () => {
    render(
      <Dialog open={false} onClose={vi.fn()} title="Saved">
        <button type="button">Yes</button>
      </Dialog>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps its close to itself, so a Sheet it opens over stays open", () => {
    const sheetClose = vi.fn();
    const onClose = vi.fn();
    render(
      <dialog open onClose={sheetClose}>
        <Dialog open onClose={onClose} title="Saved">
          <button type="button">Yes</button>
        </Dialog>
      </dialog>,
    );

    fireEvent(screen.getByRole("dialog", { name: "Saved" }), new Event("close"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(sheetClose).not.toHaveBeenCalled();
  });
});

