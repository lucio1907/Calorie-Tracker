# Weight prefill, per-user units and foods pagination

Objective: prefill the settings weight input, let each user log any food by "unidad", and paginate the foods results. Branch: `feat/units-weight-pagination` (from `development`). Delivery: ask-on-risk. Test runner: Vitest (`npx vitest run`), E2E with Playwright (`npm run test:e2e`, needs local Supabase).

## Specs

- **S1** — "en la seccion de ajustes en peso actual me gustaria que en el input quede guardado el ultimo numero que se agrego, que no quede en blanco." The settings "peso actual" input starts with the latest logged weight (es-AR decimal comma), and keeps the just-saved value after a save. Empty only when no weight was ever logged.
- **S2** — "me gustaria que en agregar alimento en la parte de unidad se pueda agregar por unidad ademas de gramos, por ejemplo si es pan lactal que se puedan agregar 2 unidades que serian 2 panes y asi con demas alimentos." Decision (user, 2026-10-28): "Cada usuario la define" — "La primera vez que elegís 'unidad' en un alimento te pide cuánto pesa (ej. pan lactal = 25 g) y la guarda solo para vos. Después aparece sola en el selector." Works for shared catalog foods and own foods. One user's unit weight is never visible to another user. Logging "2 unidades" stores grams = 2 × unit grams, quantity 2 and the unit label, like existing portions.
- **S3** — "En la seccion alimentos agrega un paginador para los resultados". *Assumption: 20 results per page with Anterior / Siguiente and the current page number; changing the search or the favorites filter goes back to page 1.*
- **S4** — Every new rule has unit tests through the public interface; migrations have pgTAP RLS tests; the full suite (Vitest, typecheck, lint, build, pgTAP) passes.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T1 | S1, S4 | inline | done (unit RED→GREEN; e2e pending until T2 lands) | b348906 |
| T2 | S3, S4 | delegated (context backstop) | done (RED→GREEN per rule; vitest 118, pgTAP 327) | see L5 |
| T3 | S2, S4 | delegated (context backstop) | done (RED→GREEN; vitest 656, pgTAP 359) | see L6 |

## Log

- **L1** (2026-10-28, user, verbatim): "en la seccion de ajustes en peso actual me gustaria que en el input quede guardado el ultimo numero que se agrego, que no quede en blanco. Tambien me gustaria que en agregar alimento en la parte de unidad se pueda agregar por unidad ademas de gramos, por ejemplo si es pan lactal que se puedan agregar 2 unidades que serian 2 panes y asi con demas alimentos. En la seccion alimentos agrega un paginador para los resultados"
- **L2** (2026-10-28): Exploration. The entry form already offers food portions besides grams (`src/features/diary/lib/entry-amount.ts`), but catalog (ARGENFOODS) foods have no portions and `food_portions` RLS only lets the food owner write (`src/features/foods/actions/portion-actions.ts`). `search_foods(search_query, favorites_only, result_limit)` has no offset (`supabase/migrations/20261014154113_foods_search_and_import_key.sql:66`).
- **L3** (2026-10-28, user choice): S2 unit weight source = "Cada usuario la define (Recomendado)".
- **L4** Routes: T1 inline. T2 and T3 run one after the other through bounded writers (parent-context backstop); both touch `src/lib/supabase/database.types.ts`, so they are sequential, not parallel. T3 changes RLS (high-risk item 2) and gets its own commit and an independent verifier.
- **L5** (2026-10-28): T2 landed. `search_foods` gains `result_offset integer default 0` (old 3-arg signature dropped in `20261028120000_search_foods_pagination.sql`; 3-arg calls still work). `/api/foods/search?page=N` (1-500) returns `{ foods, hasNextPage }` (fetches 21 rows); without `page` it returns `{ foods }` as before, so the diary sheet and recipe form are unchanged. Risk: item 1 (migration) / item 3 (function signature): hosted needs the migration before this code deploys. Advisories: keyboard focus drops when Siguiente becomes disabled on the last page; one aborted extra request when typing on page 2+.
- **L6** (2026-10-28): T3 landed. `food_portions.owner_id` (null = food owner's portion; set = private unit), unique nulls not distinct (food_id, label, owner_id), policies rewritten, per-user cap of 2000 personal units (`20261028140000_personal_food_units.sql`). Entry form offers "unidad" when missing, asks "Peso de 1 unidad (g)", creates the unit then logs quantity x grams (create and edit; recipes excluded). Risk: item 2 (RLS) and item 1 (migration): independent verifier + hosted migration before deploy. Open: a user can't fix or delete a mistyped personal unit on a shared food (read-only on the food page).
- **L7** (2026-10-28): Verification. E2E (with build) 88 passed, 2 skipped (pre-existing conditional skips). Independent verifier: S1-S4 PASS, no blockers; RLS probes (cross-user read/write, owner_id handoff, aal1 MFA, search_foods privacy at offsets, quotas) all as expected; vitest 656, pgTAP 359. Advisories: a unit saved before a failing entry insert (day quota / DB error) stays; a pre-existing unit's stored grams win over the typed weight without a message; a user can move their own unit to another visible food; no UI to fix or delete a personal unit on a shared food.
