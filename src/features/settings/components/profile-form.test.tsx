import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { chooseOption, formValues } from "@/test-support/choose-option";
import { profileFormDefaults } from "../lib/profile-schema";
import { initialProfileFormState, type ProfileFormValues } from "../lib/types";
import { settingsStrings } from "../strings";
import { ProfileForm } from "./profile-form";

const s = settingsStrings;
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
  proteinGPerKg: "1.8",
  carbsSharePct: "60",
  fatSharePct: "40",
};

describe("ProfileForm", () => {
  it("prefills every field from the stored profile", () => {
    const { container } = render(<ProfileForm defaults={stored} today={TODAY} weightKg={80} state={initialProfileFormState} />);

    expect(screen.getByLabelText(p.sex)).toHaveTextContent(s.sexes.male);
    expect(screen.getByRole("group", { name: p.birthDate })).toHaveTextContent("1/10/1996");
    expect(screen.getByLabelText(p.heightCm)).toHaveValue("180");
    expect(screen.getByLabelText(p.activityLevel)).toHaveTextContent(s.activityLevels.moderate);
    expect(screen.getByLabelText(p.goal)).toHaveTextContent(s.goals.lose);
    expect(screen.getByLabelText(p.goalKgPerWeek)).toHaveValue("0.5");
    expect(screen.getByLabelText(p.proteinGPerKg)).toHaveValue("1.8");
    expect(screen.getByLabelText(p.carbsSharePct)).toHaveValue("60");
    expect(screen.getByText(p.splitTotal("100"))).toBeInTheDocument();
    // The custom selects submit the same values the native ones did.
    expect(formValues(container.querySelector("form"))).toMatchObject({
      sex: "male",
      birthDate: "1996-01-10",
      activityLevel: "moderate",
      goal: "lose",
    });
  });

  it("only lets adults pick a birth date (latest: 18 years before today)", async () => {
    const user = userEvent.setup();
    render(<ProfileForm defaults={{ ...stored, birthDate: "2008-10-01" }} today={TODAY} weightKg={80} state={initialProfileFormState} />);

    await user.click(screen.getByRole("button", { name: new RegExp(p.birthDate) }));
    const grid = await screen.findByRole("grid");
    // Latest birth date of an 18-year-old.
    expect(within(grid).getByRole("button", { name: /October 15, 2008/ })).not.toHaveAttribute("aria-disabled");
    expect(within(grid).getByRole("button", { name: /October 16, 2008/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("starts empty with the default split before a profile exists", () => {
    const { container } = render(
      <ProfileForm defaults={profileFormDefaults(null)} today={TODAY} weightKg={80} state={initialProfileFormState} />,
    );

    expect(screen.getByLabelText(p.sex)).toHaveTextContent(p.sexPlaceholder);
    expect(screen.getByLabelText(p.goal)).toHaveTextContent(s.goals.maintain);
    expect(formValues(container.querySelector("form"))).toMatchObject({
      sex: "",
      birthDate: "",
      activityLevel: "",
      goal: "maintain",
    });
    expect(screen.queryByLabelText(p.goalKgPerWeek)).not.toBeInTheDocument();
    expect(screen.getByLabelText(p.proteinGPerKg)).toHaveValue("1.8");
    expect(screen.getByLabelText(p.carbsSharePct)).toHaveValue("60");
    expect(screen.getByLabelText(p.fatSharePct)).toHaveValue("40");
  });

  it("asks for a rate only when losing or gaining, and shows its daily effect", async () => {
    const user = userEvent.setup();
    render(<ProfileForm defaults={{ ...stored, goal: "maintain", goalKgPerWeek: "" }} today={TODAY} weightKg={80} state={initialProfileFormState} />);

    await chooseOption(user, p.goal, s.goals.gain);
    const rate = screen.getByLabelText(p.goalKgPerWeek);
    await user.type(rate, "0,25");

    expect(rate).toHaveAccessibleDescription(`${p.rateHint(0.05, 1.5)} ${p.rateEffect("275", "above")}`);

    await chooseOption(user, p.goal, s.goals.maintain);
    expect(screen.queryByLabelText(p.goalKgPerWeek)).not.toBeInTheDocument();
  });

  it("notes the safe minimum next to a weight-loss rate", async () => {
    const user = userEvent.setup();
    render(<ProfileForm defaults={{ ...stored, goalKgPerWeek: "" }} today={TODAY} weightKg={80} state={initialProfileFormState} />);

    const rate = screen.getByLabelText(p.goalKgPerWeek);
    await user.type(rate, "1.5");

    expect(rate).toHaveAccessibleDescription(
      `${p.rateHint(0.05, 1.5)} ${p.rateEffect("1650", "below")} ${p.floorHint("1200", "1500")}`,
    );
  });

  it("updates the carbs/fat total while typing", async () => {
    const user = userEvent.setup();
    render(<ProfileForm defaults={stored} today={TODAY} weightKg={80} state={initialProfileFormState} />);

    await user.clear(screen.getByLabelText(p.fatSharePct));
    await user.type(screen.getByLabelText(p.fatSharePct), "25");

    expect(screen.getByText(p.splitTotal("85"))).toBeInTheDocument();
  });

  it("previews today's macro grams from the latest weight and the target", () => {
    render(<ProfileForm defaults={stored} today={TODAY} weightKg={80} state={initialProfileFormState} />);

    // Target 2209 kcal; 80 kg x 1.8 = 144 g protein; 1633 kcal left at 60/40.
    expect(screen.getByText(p.previewFull("80", "2209", "144", "245", "73"))).toBeInTheDocument();
    expect(screen.getByLabelText(p.proteinGPerKg)).toHaveAccessibleDescription(p.proteinHint(0.8, 3));
  });

  it("updates the preview while typing the protein setting", async () => {
    const user = userEvent.setup();
    render(<ProfileForm defaults={stored} today={TODAY} weightKg={80} state={initialProfileFormState} />);

    await user.clear(screen.getByLabelText(p.proteinGPerKg));
    await user.type(screen.getByLabelText(p.proteinGPerKg), "2,2");

    // 80 x 2.2 = 176 g = 704 kcal; 1505 kcal left.
    expect(screen.getByText(p.previewFull("80", "2209", "176", "226", "67"))).toBeInTheDocument();
  });

  it("previews only protein until the profile can give a target", () => {
    render(<ProfileForm defaults={profileFormDefaults(null)} today={TODAY} weightKg={72.5} state={initialProfileFormState} />);

    // 72.5 x 1.8 = 130.5 -> 131 g.
    expect(screen.getByText(p.previewProtein("131", "72.5"))).toBeInTheDocument();
  });

  it("asks for a weight before previewing grams", () => {
    render(<ProfileForm defaults={stored} today={TODAY} weightKg={null} state={initialProfileFormState} />);

    expect(screen.getByText(p.previewNoWeight)).toBeInTheDocument();
  });

  it("warns when the protein setting would use the whole target", () => {
    render(
      <ProfileForm
        defaults={{ ...stored, activityLevel: "sedentary", goalKgPerWeek: "1.5", proteinGPerKg: "3" }}
        today={TODAY}
        weightKg={150}
        state={initialProfileFormState}
      />,
    );

    // 150 x 3 = 450 g = 1800 kcal, above the 1500 kcal floored target: capped to 375 g.
    expect(screen.getByText(p.previewFull("150", "1500", "375", "0", "0"))).toBeInTheDocument();
    expect(screen.getByText(p.previewCapped)).toBeInTheDocument();
  });

  it("ties server errors to their fields and shows the split error", () => {
    render(
      <ProfileForm
        defaults={stored}
        today={TODAY} weightKg={80}
        state={{
          status: "error",
          fieldErrors: { heightCm: v.heightRange(50, 250), carbFatSplit: v.splitTotal(95) },
          formError: v.fix,
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(v.fix);
    expect(screen.getByLabelText(p.heightCm)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(p.heightCm)).toHaveAccessibleDescription(v.heightRange(50, 250));
    expect(screen.getByText(v.splitTotal(95))).toBeInTheDocument();
  });

  it("confirms a save and disables the form while saving", () => {
    const { rerender } = render(
      <ProfileForm defaults={stored} today={TODAY} weightKg={80} state={{ status: "saved", fieldErrors: {}, formError: null }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(p.saved);

    rerender(<ProfileForm defaults={stored} today={TODAY} weightKg={80} state={initialProfileFormState} pending />);
    expect(screen.getByRole("button", { name: p.saving })).toBeDisabled();
    expect(screen.getByLabelText(p.heightCm)).toBeDisabled();
  });
});
