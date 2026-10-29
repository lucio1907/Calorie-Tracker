"use client";

import { useState } from "react";
import { Button, DatePicker, formActionProps, Select, TextField } from "@/components/ui";
import { ACTIVITY_LEVELS, addDays, dailyAdjustment, GOALS, MIN_DAILY_KCAL, SEXES, type CalendarDate, type Goal } from "@/domain";
import { toDecimal } from "@/features/foods/lib/food-schema";
import { formatAmount, formatKcal } from "@/features/foods/lib/format";
import { macroPreview, type MacroPreview } from "../lib/macro-preview";
import { carbFatSplitTotal, latestBirthDate, PROFILE_LIMITS } from "../lib/profile-schema";
import type { ProfileFieldName, ProfileFormState, ProfileFormValues } from "../lib/types";
import { settingsStrings } from "../strings";

const s = settingsStrings;
const p = settingsStrings.profile;

const SEX_OPTIONS = SEXES.map((sex) => ({ value: sex, label: s.sexes[sex] }));
const ACTIVITY_OPTIONS = ACTIVITY_LEVELS.map((level) => ({ value: level, label: s.activityLevels[level] }));
const GOAL_OPTIONS = GOALS.map((goal: Goal) => ({ value: goal, label: s.goals[goal] }));

/** First valid birth date: the column requires a date after PROFILE_LIMITS.birthDateAfter. */
const BIRTH_DATE_MIN = addDays(PROFILE_LIMITS.birthDateAfter, 1);

const SPLIT_FIELDS = [
  { name: "carbsSharePct", label: p.carbsSharePct },
  { name: "fatSharePct", label: p.fatSharePct },
] as const;

/** The grams the macro settings give today, as one line (plus the cap warning). */
function previewText(preview: MacroPreview): { line: string | null; capped: boolean } {
  switch (preview.status) {
    case "noWeight":
      return { line: p.previewNoWeight, capped: false };
    case "invalid":
      return { line: null, capped: false };
    case "protein":
      return { line: p.previewProtein(formatKcal(preview.protein), formatAmount(preview.weightKg)), capped: false };
    case "full":
      return {
        line: p.previewFull(
          formatAmount(preview.weightKg),
          formatKcal(preview.targetKcal),
          formatKcal(preview.grams.protein),
          formatKcal(preview.grams.carbs),
          formatKcal(preview.grams.fat),
        ),
        capped: preview.proteinCapped,
      };
  }
}

/**
 * "≈ 550 kcal/day below TDEE" for a valid rate (plus the safe-minimum note
 * when losing, since Today may raise the target); null while the rate is
 * blank or out of range.
 */
function rateEffect(goal: string, rate: string): string | null {
  const parsed = toDecimal(rate);
  const { min, max } = PROFILE_LIMITS.goalKgPerWeek;
  if ((goal !== "lose" && goal !== "gain") || typeof parsed !== "number" || !(parsed >= min && parsed <= max)) {
    return null;
  }
  const kcal = formatKcal(Math.abs(dailyAdjustment(goal, parsed)));
  if (goal === "gain") return p.rateEffect(kcal, "above");
  return `${p.rateEffect(kcal, "below")} ${p.floorHint(formatKcal(MIN_DAILY_KCAL.female), formatKcal(MIN_DAILY_KCAL.male))}`;
}

type ProfileFormProps = {
  /** Initial text for every field (the stored profile or the column defaults). */
  defaults: ProfileFormValues;
  /** The app's calendar day; birth dates of people under the minimum age are not selectable. */
  today: CalendarDate;
  /** Latest logged weight (the one Today uses), for the macro preview; null when none. */
  weightKg: number | null;
  state: ProfileFormState;
  action?: (formData: FormData) => void;
  pending?: boolean;
};

/**
 * Body data, weight goal and macros. Inputs are controlled so the rate field
 * can follow the goal and the carbs/fat total and the macro preview can update
 * while typing; the server validates everything again.
 */
export function ProfileForm({ defaults, today, weightKg, state, action, pending = false }: ProfileFormProps) {
  const [values, setValues] = useState(defaults);
  const errors = state.fieldErrors;
  const needsRate = values.goal === "lose" || values.goal === "gain";
  const total = carbFatSplitTotal(values);
  const preview = previewText(macroPreview(values, weightKg, today));
  const { min: minProtein, max: maxProtein } = PROFILE_LIMITS.proteinGPerKg;
  const { min: minRate, max: maxRate } = PROFILE_LIMITS.goalKgPerWeek;
  const effect = needsRate ? rateEffect(values.goal, values.goalKgPerWeek) : null;

  function update(name: ProfileFieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function field(name: ProfileFieldName) {
    return {
      name,
      value: values[name],
      error: errors[name],
      onChange: (event: { target: { value: string } }) => update(name, event.target.value),
    };
  }

  /** Same as field() for the custom Select, whose onChange gets the value itself. */
  function choice(name: ProfileFieldName) {
    return { name, value: values[name], error: errors[name], onChange: (value: string) => update(name, value) };
  }

  return (
    <form {...formActionProps(action)} noValidate className="flex flex-col gap-24" aria-busy={pending || undefined}>
      {state.formError ? (
        <p role="alert" className="rounded-inputs bg-danger-wash px-12 py-8 text-body text-danger-ink">
          {state.formError}
        </p>
      ) : null}

      <fieldset disabled={pending} className="flex flex-col gap-16">
        <legend className="mb-12 text-body font-semibold text-ink">{p.bodyLegend}</legend>
        <div className="grid gap-16 sm:grid-cols-2">
          <Select label={p.sex} required options={SEX_OPTIONS} placeholder={p.sexPlaceholder} {...choice("sex")} />
          <DatePicker
            label={p.birthDate}
            required
            min={BIRTH_DATE_MIN}
            max={latestBirthDate(today)}
            disabled={pending}
            {...choice("birthDate")}
          />
          <TextField
            label={p.heightCm}
            inputMode="decimal"
            autoComplete="off"
            required
            className="[&_input]:tabular"
            {...field("heightCm")}
          />
          <Select
            label={p.activityLevel}
            required
            options={ACTIVITY_OPTIONS}
            placeholder={p.activityPlaceholder}
            hint={p.activityHint}
            {...choice("activityLevel")}
          />
        </div>
      </fieldset>

      <fieldset disabled={pending} className="flex flex-col gap-16">
        <legend className="mb-12 text-body font-semibold text-ink">{p.goalLegend}</legend>
        <div className="grid gap-16 sm:grid-cols-2">
          <Select label={p.goal} required options={GOAL_OPTIONS} {...choice("goal")} />
          {needsRate ? (
            <TextField
              label={p.goalKgPerWeek}
              inputMode="decimal"
              autoComplete="off"
              required
              hint={effect ? `${p.rateHint(minRate, maxRate)} ${effect}` : p.rateHint(minRate, maxRate)}
              className="[&_input]:tabular"
              {...field("goalKgPerWeek")}
            />
          ) : null}
        </div>
      </fieldset>

      <fieldset
        disabled={pending}
        aria-describedby="profile-split-hint profile-split-total profile-macros-preview"
        className="flex flex-col gap-12"
      >
        <legend className="mb-4 text-body font-semibold text-ink">{p.macrosLegend}</legend>
        <div className="grid gap-16 sm:grid-cols-2">
          <TextField
            label={p.proteinGPerKg}
            inputMode="decimal"
            autoComplete="off"
            required
            hint={p.proteinHint(minProtein, maxProtein)}
            className="[&_input]:tabular"
            {...field("proteinGPerKg")}
          />
        </div>
        <div className="flex flex-col gap-12">
          <p id="profile-split-hint" className="text-caption text-ink-muted">
            {p.splitHint}
          </p>
          <div className="grid grid-cols-2 gap-12">
            {SPLIT_FIELDS.map((percent) => (
              <TextField
                key={percent.name}
                label={percent.label}
                inputMode="numeric"
                autoComplete="off"
                required
                className="[&_input]:tabular"
                {...field(percent.name)}
              />
            ))}
          </div>
          <p
            id="profile-split-total"
            aria-live="polite"
            className={`tabular text-body ${total === 100 ? "text-ink-muted" : "text-ink"}`}
          >
            {p.splitTotal(total === null ? "–" : String(total))}
          </p>
          {errors.carbFatSplit ? <p className="text-body text-danger-ink">{errors.carbFatSplit}</p> : null}
        </div>
        <div id="profile-macros-preview" aria-live="polite" className="flex flex-col gap-8">
          {preview.line ? <p className="tabular text-body text-ink">{preview.line}</p> : null}
          {preview.capped ? (
            <p className="rounded-inputs bg-over-wash px-12 py-8 text-body text-over-ink">{p.previewCapped}</p>
          ) : null}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-12">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? p.saving : p.save}
        </Button>
        <p role="status" className="text-body text-ink-muted">
          {state.status === "saved" && !pending ? p.saved : null}
        </p>
      </div>
    </form>
  );
}
