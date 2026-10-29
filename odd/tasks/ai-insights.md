# AI insights

Objective: an AI-written "how am I doing / what to improve" summary on Progress, generated server-side by a free OpenRouter model.
Branch: `feat/ai-insights` (from `development`). Delivery: `ask-on-risk`. Test runner: vitest (`npx vitest run`), pgTAP (`npx supabase test db`), Playwright (`npm run test:e2e`).
Plan: `~/.claude/plans/necesito-hacer-una-implementacion-elegant-anchor.md` (approved 2026-10-29).

## Specs

- **S1** "necesito hacer una implementacion para que un modelo de ia me de resumenes de que cosas tengo que mejorar y como vengo en general." Output: an overview ("cómo venís en general"), up to 3 things going well, and up to 3 things to improve, each citing the user's numbers.
- **S2** "Quiero usar un modelo completamente gratuito de openrouter, necesito que me recomiendes cual es el que mejor anda para estos tipos de resumenes y tiene baja latencia". After the T1 benchmark (L7): primary `nvidia/nemotron-3.5-lightning:free`, fallback `google/gemma-4-26b-a4b-it:free`. Only `:free` models are used, and no JSON mode is requested (the primary lacks it); the reply is parsed and validated instead.
- **S3** Placement chosen by the user: "Progreso, con botón". A card on Progress with a "Generar resumen" button for the selected range (7, 30 or 90 days). One summary per user, range and day, stored and shown again on reload without a new call.
- **S4** (assumption, approved in the plan) Only aggregated numbers are sent to the model: never name, email, birth date or food names.
- **S5** (assumption, approved in the plan) At most 3 generations per user per day (app time zone), so one account cannot use up the account-wide free quota (50/day). Rate-limited, unavailable and daily-limit cases show a message, not an error page.
- **S6** (assumption, approved in the plan) The key is `OPENROUTER_API_KEY`, server-only. A missing key fails with a clear error and never reaches the browser.

## Tasks

| ID | Specs | Route | Status | Evidence |
|---|---|---|---|---|
| T1 | S2 | inline (scratch script) | done | benchmark L7; client updated (models, no response_format), 25 tests passed |
| T2 | S3, S5 | delegated (parallel with T3) | done (commit bd099a0) | RED: ai_insights planned 52 ran 0; GREEN: 16 files, 411 tests; types diff only new objects; parent spot check: 411 passed |
| T3 | S2, S6 | delegated (parallel with T2) | done (commit a340d5c) | RED: test files failed to load (no module); GREEN: 25 passed; typecheck + eslint clean; parent spot check: 25 passed |
| T4 | S1, S4 | delegated with T5 (context backstop) | in progress | — |
| T5 | S1, S3, S5 | delegated with T4 (depends on T4) | in progress | — |

- T1: latency benchmark, 5 calls per candidate (gemma-4-26b-a4b, nemotron-3.5-super-vl, nemotron-3.5-lightning): TTFT, total time, JSON validity.
- T2: migration with `daily_macro_totals(start_date, end_date)`, table `public.insights` + RLS + aal2, `consume_insight_request()` (3/day), pgTAP tests, regenerated `database.types.ts`.
- T3: `src/features/insights/data/openrouter.ts` client, error classes and server-only env reader, with tests.
- T4: pure input builder, prompt and output schema, plus the shared `loadProgressData` extraction.
- T5: server action, card and container, Progress wiring, strings, README env var.

Route evidence: T2 and T3 are independent units with disjoint edit surfaces, each several files of work (Writer trigger (a), parallelism). The parent context is also near the long-session backstop (Writer trigger (b)).

## Log

- **L1** (2026-10-29, user) "necesito hacer una implementacion para que un modelo de ia me de resumenes de que cosas tengo que mejorar y como vengo en general. Quiero usar un modelo completamente gratuito de openrouter, necesito que me recomiendes cual es el que mejor anda para estos tipos de resumenes y tiene baja latencia"
- **L2** (2026-10-29, user) Placement answer: "Progreso, con botón (Recommended)".
- **L3** (2026-10-29) Evidence for S2, from `GET https://openrouter.ai/api/v1/models` and `/endpoints`:
  - 19 free models are listed, and free endpoints publish no latency or throughput (`latency_last_30m: null`).
  - gemma-4-26b-a4b: MoE with 3.8B active parameters, 100% uptime over 1 day, `response_format` supported.
  - nemotron-3.5-super-vl: 100% uptime over 1 day, structured outputs supported.
  - nemotron-3.5-lightning: 94.7% uptime over 1 day, no `response_format`.
  - Free limits are 20 requests per minute and 50 per day per account (1000 per day with at least 10 credits bought).
  - NVIDIA's free endpoint page says usage is logged.
- **L4** (2026-10-29) Plan approved. Next: T2 and T3 in parallel; T1 when the key is available.
- **L5** (2026-10-29) T3 done. Request fields come from the OpenRouter docs:
  - `models` fallback: https://openrouter.ai/docs/guides/routing/model-fallbacks
  - `provider.require_parameters`: https://openrouter.ai/docs/guides/routing/provider-selection
  - `reasoning: { effort: "none" }`: https://openrouter.ai/docs/use-cases/reasoning-tokens
  - `response_format`: https://openrouter.ai/docs/api/reference/overview
  - Header `X-OpenRouter-Title` only; there is no deployed URL in the repo for `HTTP-Referer`.
  - Open for T1: confirm that both models accept `effort: "none"` (models with mandatory reasoning reject it).
  - Open for T5: add `OPENROUTER_API_KEY` to `.env.example`.
- **L6** (2026-10-29) T2 done. Migration `20261029120000_ai_insights.sql`, with these deviations:
  - The content cap uses `octet_length(content::text) <= 8192`, because it is deterministic.
  - `consume_insight_request` also requires `private.mfa_satisfied()`, as the Open Food Facts slot functions do.
  - `service_role` gets full grants, following the house style.
  - The unique key doubles as the lookup index.
  - Types come from `npx supabase gen types typescript --local`. Always pass `--local`, because a hosted project is linked.
- **L7** (2026-10-29, T1 benchmark: 5 streamed calls per model, with a realistic 7-day input and `reasoning: { effort: "none" }`)
  - Key status (`GET /api/v1/key`): `is_free_tier: true`, `usage: 0`, free-model requests `used 0 / limit 50`.
  - `gemma-4-26b-a4b:free`: 0/5. Every call got HTTP 429 "temporarily rate-limited upstream".
  - `nemotron-3.5-super-vl:free`: 4/5 OK (one 502 empty response). Median TTFT about 33.3 s, total about 33.3 s, `cost 0`.
  - `nemotron-3.5-lightning:free`: 5/5 OK with valid JSON (no JSON mode). Median TTFT 332 ms, total 3370 ms, `cost 0` on every call.
  - Decision: primary lightning, fallback gemma-4-26b. Dropped `response_format` and `provider.require_parameters`, because lightning lacks JSON mode and would be skipped.
  - Quality note: the sample overview read a positive balance (+250 kcal with a lose goal) as "vas bien encaminado". T4's prompt must spell out what the balance sign means for each goal.
- **L8** (2026-10-29, user) "ya agregue la api key, esto no me va a cobrar nada por usarlo no?"
