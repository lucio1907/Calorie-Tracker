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
    expect(previewActivityKcal(9.3, 70, "30")).toBe(291);
    expect(previewActivityKcal(9.3, 70, "")).toBeNull();
    expect(previewActivityKcal(9.3, 70, "12.5")).toBeNull();
  });
});

describe("ActivityEntryForm", () => {
  it("previews kcal for the typed duration", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByText(t.form.previewBasis("9,3", "70"))).toBeInTheDocument();
    expect(screen.getByText("291")).toBeInTheDocument();

    const minutes = screen.getByLabelText(t.form.minutes);
    await user.clear(minutes);
    expect(screen.getByText(t.form.previewEmpty)).toBeInTheDocument();
    await user.type(minutes, "60");
    // (9.3 - 1) x 70 x 1 h = 581.
    expect(screen.getByText("581")).toBeInTheDocument();
  });

  it("posts only the hidden ids, the duration and the optional calories", () => {
    const { container } = renderForm();
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    expect(Object.fromEntries(new FormData(form!))).toEqual({
      date: "2026-10-15",
      activityId: "8",
      minutes: "30",
      manualKcal: "",
    });
  });

  it("shows the typed calories instead of the estimate, and returns to it when cleared", async () => {
    const user = userEvent.setup();
    renderForm();
    const manualKcal = screen.getByLabelText(t.form.manualKcal);

    await user.type(manualKcal, "450");
    expect(screen.getByText("450")).toBeInTheDocument();
    expect(screen.queryByText("291")).not.toBeInTheDocument();
    expect(screen.getByText(t.form.previewManual)).toBeInTheDocument();

    await user.clear(manualKcal);
    expect(screen.getByText("291")).toBeInTheDocument();
    expect(screen.queryByText(t.form.previewManual)).not.toBeInTheDocument();
  });

  it("shows no calories while the typed value is invalid", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(t.form.manualKcal), "abc");
    expect(screen.queryByText("291")).not.toBeInTheDocument();
    expect(screen.getByText(t.form.previewInvalidKcal)).toBeInTheDocument();
  });

  it("starts from the stored calories when editing a manual entry", () => {
    render(
      <ActivityEntryForm
        title="Running, 10 km/h"
        met={9.3}
        weightKg={70}
        defaultMinutes="30"
        defaultManualKcal="1200"
        hidden={{ entryId: "42" }}
        submitLabel={t.form.update}
        state={initialActivityFormState}
      />,
    );
    expect(screen.getByLabelText(t.form.manualKcal)).toHaveValue("1200");
  });

  it("shows the field error for the calories", () => {
    renderForm({
      ...initialActivityFormState,
      status: "error",
      fieldErrors: { manualKcal: t.validation.wholeKcal },
      formError: t.validation.fix,
      values: { minutes: "30", manualKcal: "abc" },
    });
    const manualKcal = screen.getByLabelText(t.form.manualKcal);
    expect(manualKcal).toHaveValue("abc");
    expect(manualKcal).toHaveAccessibleDescription(expect.stringContaining(t.validation.wholeKcal));
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
