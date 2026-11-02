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
- **S4** Item 5, "Preguntas puntuales": "Tres o cuatro preguntas predefinidas, tipo '¿por qué no bajo de peso?', en vez de chat libre. Así controlás la cuota." Answers are stored (L6: "si guardalas"): one per question, range and app day, so a reload or a repeated question spends nothing.
  - (assumption) Four questions: why the weight does not change as expected, how to reach the protein target, how to improve weekends, how to log more consistently. Shown in the AI section only, for the selected range; today's stored answers show on load.
- **S5** "el unico usuario soy yo, lo mejor no seria darle toda la cuota a mi usuario?" — the per-user daily limit goes from 10 to 50 (the shared OpenRouter key quota). Signups are closed (`supabase/config.toml` `enable_signup = false`); lower it again if they open.

## Tasks

| ID | Specs | Route | Status | Evidence |
|---|---|---|---|---|
| T1 | S1 | inline | done (bc20071) | RED: insight-input 7 failed (weekPattern, logging, expected weight undefined); GREEN: insights 113 passed; tsc + eslint clean |
| T2 | S2 | inline | done (24e341d) | RED: getPreviousInsight 3, previousBlock/previousWindow (missing module), action 3 failed; GREEN: insights 125, full vitest 1028 passed; tsc + eslint clean |
| T3 | S3 | inline | done (7b24e76) | RED: insight-stats (missing module), card stats 4 failed; GREEN: vitest 1037 passed; e2e insights+progress 17 passed (desktop+mobile), screenshots checked |
| T4a | S5 | inline | done (c5dd4a4) | RED: pgTAP 2/52 failed (tests 45, 48: limit still 10); GREEN after `supabase migration up`: pgTAP 420 passed |
| T4b | S4 | inline | done (7f1b557, fix in Log L9) | RED: pgTAP insight_answers (relation missing), questions/prompt lib, data 8, action 15, UI 2 files failed; GREEN: pgTAP 446, vitest 1090, e2e insights 9 passed; tsc + eslint clean |

Route evidence: T1 and T2 both change `insight-input.ts`, the prompt and the action, so they run inline one after another (no Writer trigger). Forecast for T1-T2: ~350 authored lines.

## Log

- **L1** (2026-10-30, user) "necesito que mejores la seccion de ia ya que es muy basico lo que tiene y me gustaria agregarle mas cosas, que me recomendas?" — then "dale, arrancá con 1 + 2 y luego continuamos con el 4 y 5".
- **L2** (2026-10-30) Fiber and sodium dropped from S1: `food_entries` (migration 20261014151347) snapshots only kcal, protein, carbs and fat, and `daily_macro_totals` returns only those.
- **L3** (2026-10-30) T1 committed as bc20071; T2 adds `getPreviousInsight`, `previous-insight.ts` and the `previous` block (4 extra DB reads before the slot, no extra OpenRouter call). Next: T3 (S3) and T4 (S4) in a later session.
- **L4** (2026-10-30, user) "continua". T3: the stats come from the same `buildInsightInput` the model reads (`lib/insight-stats.ts`), loaded per page by `data/insight-stats.ts` (macro read is secondary: a failure shows the text only). Shown only next to a summary, on /insights and Progress; past summaries in the history show text only (their numbers would need one read each). E2E seeds a stored summary (`E2EData.insight`) and resets `insights`.
- **L5** (2026-10-30, user) "el unico usuario soy yo, lo mejor no seria darle toda la cuota a mi usuario?"
- **L6** (2026-10-30, user) "si guardalas". RDD: T1-T3 range (main..7b24e76) consent declined by the user ("Saltear esta vez"). T4a (risk item 2: the per-user guard) and T4b (risk item 1: new table, migration; item 2: RLS) get their own commits and an independent verifier.
- **L7** (2026-10-30) T4a committed as c5dd4a4. Independent verifier: PASS on every item (function body identical but the constant, grants, 51-call probe 50 true then false, rolled back; signups closed in config.toml). Advisory: the hosted project's signup setting is not visible from the repo.
- **L8** (2026-10-30) T4b: migration 20261030130000_insight_answers (RLS select/insert own, aal2 restrictive, row quota 5000), `lib/insight-questions.ts`, `lib/question-prompt.ts` (shares `DATA_GUIDE` and `SAFETY_RULES` with the summary prompt), `data/insight-answers.ts`, `askInsightQuestion`, `InsightQuestions` UI on /insights only. Types regenerated (additive only).
- **L9** (2026-10-30) Independent verifier on 7f1b557: PASS on the migration, RLS probes (rolled back), tests, action and privacy; one BLOCKER: splitting the prompt into shared constants reordered the summary prompt (the null line and the last two rules). Fixed: `NULL_RULE` and `PROFILE_RULE` keep the summary text byte-identical to c5dd4a4 (diffed rendered prompts); a test pins the order (RED on 7f1b557: 1 failed; GREEN: insights 188 passed).
- **L10** (2026-10-30, user) "si arreglalo" — review finding R3-stuck-pending: a rejected `askInsightQuestion` left every question disabled. Fixed with try/catch/finally in `insight-questions-container.tsx` (generic error, pending always cleared). RED: 1 failed (no alert, unhandled TypeError); GREEN: insights 189 passed; tsc + eslint clean.
- **L11** (2026-10-30, user) "agrega los tests ya que son importantes, ajusta lo del doble click" — review findings on a10bac0: R3-page-fallbacks-unproved → new `insights-page.test.tsx` (5 tests; each of the three fallbacks removed in turn makes its test fail, file restored); R3-stored-answer-read-error-untested → `getStoredAnswer` read-error and schema-mismatch tests; R3-double-ask-race → synchronous `useRef` lock in `insight-questions-container.tsx` (RED: 3 calls for 3 fast clicks; GREEN: 1). Insights 197, full vitest 1100 passed; tsc + eslint clean.
