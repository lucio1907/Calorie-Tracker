import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { profileFormDefaults } from "../lib/profile-schema";
import { initialProfileFormState, type ProfileFormValues } from "../lib/types";
import { settingsStrings } from "../strings";
import { ProfileForm } from "./profile-form";

const p = settingsStrings.profile;
const v = settingsStrings.validation;
const TODAY = "2026-10-15";

const stored: ProfileFormValues = {
  sex: "male",
  birthDate: "1996-01-10",
  heightCm: "180",
  activityLevel: "moderate",
  goal: "lose",
  goalKgPerWeek: "0.5",
  proteinPct: "30",
  carbsPct: "40",
  fatPct: "30",
};

describe("ProfileForm", () => {
  it("prefills every field from the stored profile", () => {
    render(<ProfileForm defaults={stored} today={TODAY} state={initialProfileFormState} />);

    expect(screen.getByLabelText(p.sex)).toHaveValue("male");
    expect(screen.getByLabelText(p.birthDate)).toHaveValue("1996-01-10");
    expect(screen.getByLabelText(p.birthDate)).toHaveAttribute("max", TODAY);
    expect(screen.getByLabelText(p.heightCm)).toHaveValue("180");
    expect(screen.getByLabelText(p.activityLevel)).toHaveValue("moderate");
    expect(screen.getByLabelText(p.goal)).toHaveValue("lose");
    expect(screen.getByLabelText(p.goalKgPerWeek)).toHaveValue("0.5");
    expect(screen.getByLabelText(p.proteinPct)).toHaveValue("30");
    expect(screen.getByText(p.macroTotal("100"))).toBeInTheDocument();
  });

  it("starts empty with the default split before a profile exists", () => {
    render(<ProfileForm defaults={profileFormDefaults(null)} today={TODAY} state={initialProfileFormState} />);

    expect(screen.getByLabelText(p.sex)).toHaveValue("");
    expect(screen.getByLabelText(p.goal)).toHaveValue("maintain");
    expect(screen.queryByLabelText(p.goalKgPerWeek)).not.toBeInTheDocument();
    expect(screen.getByLabelText(p.carbsPct)).toHaveValue("40");
  });

  it("asks for a rate only when losing or gaining, and shows its daily effect", async () => {
    const user = userEvent.setup();
    render(<ProfileForm defaults={{ ...stored, goal: "maintain", goalKgPerWeek: "" }} today={TODAY} state={initialProfileFormState} />);

    await user.selectOptions(screen.getByLabelText(p.goal), "gain");
    const rate = screen.getByLabelText(p.goalKgPerWeek);
    await user.type(rate, "0,25");

    expect(rate).toHaveAccessibleDescription(`${p.rateHint(0.05, 1.5)} ${p.rateEffect("275", "above")}`);

    await user.selectOptions(screen.getByLabelText(p.goal), "maintain");
    expect(screen.queryByLabelText(p.goalKgPerWeek)).not.toBeInTheDocument();
  });

  it("updates the macro total while typing", async () => {
    const user = userEvent.setup();
    render(<ProfileForm defaults={stored} today={TODAY} state={initialProfileFormState} />);

    await user.clear(screen.getByLabelText(p.fatPct));
    await user.type(screen.getByLabelText(p.fatPct), "25");

    expect(screen.getByText(p.macroTotal("95"))).toBeInTheDocument();
  });

  it("ties server errors to their fields and shows the split error", () => {
    render(
      <ProfileForm
        defaults={stored}
        today={TODAY}
        state={{
          status: "error",
          fieldErrors: { heightCm: v.heightRange(50, 250), macroSplit: v.macroTotal(95) },
          formError: v.fix,
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(v.fix);
    expect(screen.getByLabelText(p.heightCm)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(p.heightCm)).toHaveAccessibleDescription(v.heightRange(50, 250));
    expect(screen.getByText(v.macroTotal(95))).toBeInTheDocument();
  });

  it("confirms a save and disables the form while saving", () => {
    const { rerender } = render(
      <ProfileForm defaults={stored} today={TODAY} state={{ status: "saved", fieldErrors: {}, formError: null }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(p.saved);

    rerender(<ProfileForm defaults={stored} today={TODAY} state={initialProfileFormState} pending />);
    expect(screen.getByRole("button", { name: p.saving })).toBeDisabled();
    expect(screen.getByLabelText(p.heightCm)).toBeDisabled();
  });
});
