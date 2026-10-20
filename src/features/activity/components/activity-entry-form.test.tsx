import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { initialActivityFormState, type ActivityFormState } from "../lib/types";
import { activityStrings } from "../strings";
import { ActivityEntryForm, previewActivityKcal } from "./activity-entry-form";

const t = activityStrings;

function renderForm(state: ActivityFormState = initialActivityFormState) {
  return render(
    <ActivityEntryForm
      title="Running, 10 km/h"
      met={9.3}
      weightKg={70}
      defaultMinutes="30"
      hidden={{ date: "2026-10-15", activityId: "8" }}
      submitLabel={t.form.save}
      state={state}
    />,
  );
}

describe("previewActivityKcal", () => {
  it("uses the same rules as the server", () => {
    expect(previewActivityKcal(9.3, 70, "30")).toBe(326);
    expect(previewActivityKcal(9.3, 70, "")).toBeNull();
    expect(previewActivityKcal(9.3, 70, "12.5")).toBeNull();
  });
});

describe("ActivityEntryForm", () => {
  it("previews kcal for the typed duration", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByText(t.form.previewBasis("9.3", "70"))).toBeInTheDocument();
    expect(screen.getByText("326")).toBeInTheDocument();

    const minutes = screen.getByLabelText(t.form.minutes);
    await user.clear(minutes);
    expect(screen.getByText(t.form.previewEmpty)).toBeInTheDocument();
    await user.type(minutes, "60");
    // 9.3 x 70 x 1 h = 651.
    expect(screen.getByText("651")).toBeInTheDocument();
  });

  it("posts only the hidden ids and the duration", () => {
    const { container } = renderForm();
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    expect(Object.fromEntries(new FormData(form!))).toEqual({ date: "2026-10-15", activityId: "8", minutes: "30" });
  });

  it("shows field errors from the server", () => {
    renderForm({
      ...initialActivityFormState,
      status: "error",
      fieldErrors: { minutes: t.validation.wholeMinutes },
      formError: t.validation.fix,
    });
    expect(screen.getByRole("alert")).toHaveTextContent(t.validation.fix);
    expect(screen.getByLabelText(t.form.minutes)).toHaveAccessibleDescription(
      expect.stringContaining(t.validation.wholeMinutes),
    );
  });

  it("links to Settings when the server found no weight", () => {
    renderForm({ ...initialActivityFormState, status: "error", formError: t.errors.noWeight, needsWeight: true });
    expect(screen.getByRole("alert")).toHaveTextContent(t.errors.noWeight);
    expect(screen.getByRole("link", { name: t.weight.missingAction })).toHaveAttribute("href", "/settings");
  });
});
