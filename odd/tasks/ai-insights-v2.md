# AI insights v2

Objective: richer AI summaries (more patterns in the model input, continuity with the previous summary), then a visual summary and predefined questions.
Branch: `feat/ai-insights-v2` (from `main`). Delivery: `ask-on-risk`. Test runner: vitest (`npx vitest run`).

## Specs

The user approved items of the assistant's recommendation by number (L1); each spec quotes that item.

- **S1** Item 1, "Darle mejores datos al modelo (no gasta llamadas extra)": "Semana vs. fin de semana", "Peso esperado vs. real: con el déficit acumulado, 'deberías haber bajado ~1,2 kg y bajaste 0,4'", "Constancia: racha de días registrados y días sin registrar". Zero extra OpenRouter calls; only aggregated numbers reach the model.
  - (assumption) Weekend = Saturday and Sunday. Expected weight change = summed daily balance (logged days with a target) from the first weigh-in of the range to the day before the last one, / 7700 kcal per kg. Current streak ends on the last day, or the day before when the last day has no food yet.
  - Out of scope (L2): "Fibra y sodio" — `food_entries` stores no fiber or sodium snapshot, so it needs a migration and a backfill.
- **S2** Item 2, "Continuidad entre resúmenes": "Pasarle las improvements del resumen anterior para que diga 'la semana pasada te propuse subir la proteína y pasaste de 80 g a 105 g'".
  - (assumption) The previous summary is the newest stored one for the same range generated between 2 × range and half the range days before today (less would mostly overlap the current period). Its numbers are recomputed for its own window. A failed read leaves it out; generation still works.
- **S3** Item 4, "Visual del resumen": "un mini-gráfico de macros contra objetivo y un indicador de estado (a favor o en contra de la meta). Es pura UI, cero llamadas."
- **S4** Item 5, "Preguntas puntuales": "Tres o cuatro preguntas predefinidas, tipo '¿por qué no bajo de peso?', en vez de chat libre. Así controlás la cuota."

## Tasks

| ID | Specs | Route | Status | Evidence |
|---|---|---|---|---|
| T1 | S1 | inline | done (bc20071) | RED: insight-input 7 failed (weekPattern, logging, expected weight undefined); GREEN: insights 113 passed; tsc + eslint clean |
| T2 | S2 | inline | done (see Log L3) | RED: getPreviousInsight 3, previousBlock/previousWindow (missing module), action 3 failed; GREEN: insights 125, full vitest 1028 passed; tsc + eslint clean |
| T3 | S3 | inline | pending (next session) | |
| T4 | S4 | inline | pending (next session) | |

Route evidence: T1 and T2 both change `insight-input.ts`, the prompt and the action, so they run inline one after another (no Writer trigger). Forecast for T1-T2: ~350 authored lines.

## Log

- **L1** (2026-10-30, user) "necesito que mejores la seccion de ia ya que es muy basico lo que tiene y me gustaria agregarle mas cosas, que me recomendas?" — then "dale, arrancá con 1 + 2 y luego continuamos con el 4 y 5".
- **L2** (2026-10-30) Fiber and sodium dropped from S1: `food_entries` (migration 20261014151347) snapshots only kcal, protein, carbs and fat, and `daily_macro_totals` returns only those.
- **L3** (2026-10-30) T1 committed as bc20071; T2 adds `getPreviousInsight`, `previous-insight.ts` and the `previous` block (4 extra DB reads before the slot, no extra OpenRouter call). Next: T3 (S3) and T4 (S4) in a later session.
