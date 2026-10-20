import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sheet } from "./sheet";

// jsdom has no modal dialogs: open/close the <dialog> by toggling its attribute.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute("open");
};

function renderSheet(onClose = vi.fn()) {
  render(
    <Sheet open onClose={onClose} title="Panel" closeLabel="Close">
      <p>Content</p>
    </Sheet>,
  );
  const dialog = screen.getByText("Content").closest("dialog") as HTMLDialogElement;
  // jsdom has no layout: give the panel the box it has on a phone (bottom half of the screen).
  dialog.getBoundingClientRect = () => ({ left: 0, right: 390, top: 400, bottom: 844, x: 0, y: 400, width: 390, height: 444, toJSON: () => ({}) });
  return { dialog, onClose };
}

describe("Sheet", () => {
  it("closes on a backdrop click outside the panel", () => {
    const { dialog, onClose } = renderSheet();
    fireEvent.click(dialog, { clientX: 200, clientY: 100 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open when a click inside the panel lands on the dialog element", () => {
    // Press on one child, release on another (a popover opened in between): the click targets the dialog.
    const { dialog, onClose } = renderSheet();
    fireEvent.click(dialog, { clientX: 200, clientY: 600 });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes from its labelled close button", () => {
    const { onClose } = renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the last content while sliding out, then drops it", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <Sheet open onClose={vi.fn()} title="Edit entry" closeLabel="Close">
        <p>Form</p>
      </Sheet>,
    );
    // Callers clear title and content as they close the sheet.
    rerender(
      <Sheet open={false} onClose={vi.fn()} title="" closeLabel="Close">
        {null}
      </Sheet>,
    );
    expect(screen.getByText("Form")).toBeInTheDocument();
    expect(screen.getByText("Edit entry")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(250));
    expect(screen.queryByText("Form")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
