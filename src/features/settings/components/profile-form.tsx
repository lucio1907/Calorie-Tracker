"use client";

import { useState } from "react";
import { Button, SelectField, TextField } from "@/components/ui";
import { ACTIVITY_LEVELS, dailyAdjustment, GOALS, SEXES, type CalendarDate, type Goal } from "@/domain";
import { toDecimal } from "@/features/foods/lib/food-schema";
import { formatKcal } from "@/features/foods/lib/format";
import { macroSplitTotal, PROFILE_LIMITS } from "../lib/profile-schema";
import type { ProfileFieldName, ProfileFormState, ProfileFormValues } from "../lib/types";
import { settingsStrings } from "../strings";

const s = settingsStrings;
const p = settingsStrings.profile;

const PERCENT_FIELDS = [
  { name: "proteinPct", label: p.proteinPct },
  { name: "carbsPct", label: p.carbsPct },
  { name: "fatPct", label: p.fatPct },
] as const;

/** "≈ 550 kcal/day below TDEE" for a valid rate; null while the rate is blank or out of range. */
function rateEffect(goal: string, rate: string): string | null {
  const parsed = toDecimal(rate);
  const { min, max } = PROFILE_LIMITS.goalKgPerWeek;
  if ((goal !== "lose" && goal !== "gain") || typeof parsed !== "number" || !(parsed >= min && parsed <= max)) {
    return null;
  }
  const kcal = formatKcal(Math.abs(dailyAdjustment(goal, parsed)));
  return p.rateEffect(kcal, goal === "lose" ? "below" : "above");
}

type ProfileFormProps = {
  /** Initial text for every field (the stored profile or the column defaults). */
  defaults: ProfileFormValues;
  /** The app's calendar day; birth dates after it are not selectable. */
  today: CalendarDate;
  state: ProfileFormState;
  action?: (formData: FormData) => void;
  pending?: boolean;
};

/**
 * Body data, weight goal and macro split. Inputs are controlled so the rate
 * field can follow the goal and the macro total can update while typing; the
 * server validates everything again.
 */
export function ProfileForm({ defaults, today, state, action, pending = false }: ProfileFormProps) {
  const [values, setValues] = useState(defaults);
  const errors = state.fieldErrors;
  const needsRate = values.goal === "lose" || values.goal === "gain";
  const total = macroSplitTotal(values);
  const { min: minRate, max: maxRate } = PROFILE_LIMITS.goalKgPerWeek;
  const effect = needsRate ? rateEffect(values.goal, values.goalKgPerWeek) : null;

  function field(name: ProfileFieldName) {
    return {
      name,
      value: values[name],
      error: errors[name],
      onChange: (event: { target: { value: string } }) => setValues((current) => ({ ...current, [name]: event.target.value })),
    };
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-24" aria-busy={pending || undefined}>
      {state.formError ? (
        <p role="alert" className="rounded-inputs bg-danger-wash px-12 py-8 text-body text-danger-ink">
          {state.formError}
        </p>
      ) : null}

      <fieldset disabled={pending} className="flex flex-col gap-16">
        <legend className="mb-12 text-body font-semibold text-ink">{p.bodyLegend}</legend>
        <div className="grid gap-16 sm:grid-cols-2">
          <SelectField label={p.sex} required {...field("sex")}>
            <option value="" disabled>
              {p.sexPlaceholder}
            </option>
            {SEXES.map((sex) => (
              <option key={sex} value={sex}>
                {s.sexes[sex]}
              </option>
            ))}
          </SelectField>
          <TextField label={p.birthDate} type="date" required max={today} min="1900-01-02" {...field("birthDate")} />
          <TextField
            label={p.heightCm}
            inputMode="decimal"
            autoComplete="off"
            required
            className="[&_input]:tabular"
            {...field("heightCm")}
          />
          <SelectField label={p.activityLevel} required {...field("activityLevel")}>
            <option value="" disabled>
              {p.activityPlaceholder}
            </option>
            {ACTIVITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {s.activityLevels[level]}
              </option>
            ))}
          </SelectField>
        </div>
      </fieldset>

      <fieldset disabled={pending} className="flex flex-col gap-16">
        <legend className="mb-12 text-body font-semibold text-ink">{p.goalLegend}</legend>
        <div className="grid gap-16 sm:grid-cols-2">
          <SelectField label={p.goal} required {...field("goal")}>
            {GOALS.map((goal: Goal) => (
              <option key={goal} value={goal}>
                {s.goals[goal]}
              </option>
            ))}
          </SelectField>
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
        aria-describedby="profile-macros-hint profile-macros-total"
        className="flex flex-col gap-12"
      >
        <legend className="mb-4 text-body font-semibold text-ink">{p.macrosLegend}</legend>
        <p id="profile-macros-hint" className="text-caption text-ink-muted">
          {p.macrosHint}
        </p>
        <div className="grid grid-cols-3 gap-12">
          {PERCENT_FIELDS.map((percent) => (
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
          id="profile-macros-total"
          aria-live="polite"
          className={`tabular text-body ${total === 100 ? "text-ink-muted" : "text-ink"}`}
        >
          {p.macroTotal(total === null ? "–" : String(total))}
        </p>
        {errors.macroSplit ? <p className="text-body text-danger-ink">{errors.macroSplit}</p> : null}
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
