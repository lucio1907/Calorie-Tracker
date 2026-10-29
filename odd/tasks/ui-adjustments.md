# UI adjustments

Objective: a clearer add-food panel and Foods screen, a source filter, an "add another?" prompt, a compact Diary date bar, an AI summaries section, an app logo, and a verified calorie math audit.
Branch: `feat/ui-adjustments` (from `development`). Delivery: `ask-on-risk`. Test runner: vitest (`npx vitest run`), pgTAP (`npx supabase test db`), Playwright (`npm run test:e2e`).

## Specs

- **S1** "tenemos que mejorar la sidebar de agreagar comida para que se vea mas intuitiva y mejor ordenada". The sidebar is the Diary's add-food `Sheet` (picker step in `food-picker-container.tsx`).
- **S2** "Al crear alimento que apareza un modal si quiero agregar otro o no ." After a food is created, a modal asks whether to add another one; "yes" reopens an empty create form, "no" continues the current flow.
- **S3** "quiero que aparezca la categoria de creados por mi y poder filtrar por categorias". Categories are the food source (user answer L2): Todos · Creados por mí · Favoritos · ARGENFOODS · Open Food Facts. "Creados por mí" means `source = 'custom'` (Open Food Facts imports also carry the user's `owner_id`).
- **S4** "el ancho de los selectores de fechas en diario quiero que este mas compacto y si podes agregar otra cosa en el espacio en blanco que va a quedar mejor". (assumption) The freed space shows the day's calorie target progress: eaten, target and remaining.
- **S5** "crear una nueva seccion de ia en donde van a estar todos los resumenes". (assumption) A new nav section lists every stored summary, newest first.
- **S6** "Crear un logo para la aplicacion que sea original y sea lindo a la vista". Used in the shell, the login screen and the app icons.
- **S7** "todo el dashboard de alimentos necesito que lo ordenes". The Foods screen (`foods-screen-container.tsx`).
- **S8** "necesito que verifiques si todas las cuentas de calorias y todo se hacen bien y no tienen errores, es crucial para saber si estoy contando bien o no". Audit every calculation the user relies on; fix confirmed bugs with tests.

## Tasks

| ID | Specs | Route | Status | Evidence |
|---|---|---|---|---|
| T1 | S8 | audit delegated (read-only), fixes inline | done (9379933) | RED: exercise tests 7 failed (gross MET); a decimal MET case (2.3) rounded 45.5 down until net MET used tenths; GREEN: activity/domain/today/progress 317 passed; profile hint RED 1 failed then 112 passed |
| T2 | S3 | inline | done (ba431a7 migration, cab267d UI) | RED: pgTAP 9/9 failed, route 7 failed, chips/results 4 failed; GREEN: pgTAP 420 passed, vitest 347 passed |
| T3 | S2 | inline | done (d4398af Dialog, cab267d prompt) | RED: missing modules / 2 failed; GREEN: Dialog 3, FoodFormContainer 3 passed |
| T4 | S1 | inline | done (cab267d) | RED: picker order/barcode/recipes 3 failed; GREEN: 4 passed |
| T5 | S4 | inline | done (0064528) | RED: missing module; GREEN: DayTarget 3 passed; full vitest 1001 passed |
| T6 | S5 | delegated (parallel with T7) | done (ca3cb99) | writer RED 5 failed, GREEN 167 passed; parent added pastInsights (RED missing module, GREEN 102 passed) |
| T7 | S6 | delegated (parallel with T6) | done (a6df736) | writer RED missing module, GREEN 3 passed; icons 180x180 PNG + 3-size ICO; parent viewed apple-icon.png |
| T8 | S7 | inline | done (cab267d) | RED: layout test failed (no aside); GREEN: foods 347 passed with T2-T4 |

- T2: new `search_foods` migration with a source filter, route param, hook cache key, `searchFoods` option, chips UI. Risk item 1 (migration).
- T3: centered `Dialog` primitive in `src/components/ui`, used after create on Diary and Foods.
- T6: `/insights` route, nav item, list read on `public.insights`.
- T7: SVG mark, `src/app/icon.svg`, favicon, apple icon, shell and login.

Route evidence: T6 and T7 are independent units with disjoint edit surfaces (insights feature + new route + nav items; app icons + shell header + login), each several files (Writer trigger (a)). T2-T5 and T8 share the foods/diary containers, so they run inline one after another.

## Log

- **L1** (2026-10-29, user) "hay que hacer un par de ajustes / tenemos que mejorar la sidebar de agreagar comida para que se vea mas intuitiva y mejor ordenada / Al crear alimento que apareza un modal si quiero agregar otro o no . / quiero que aparezca la categoria de creados por mi y poder filtrar por categorias / el ancho de los selectores de fechas en diario quiero que este mas compacto y si podes agregar otra cosa en el espacio en blanco que va a quedar mejor / crear una nueva seccion de ia en donde van a estar todos los resumenes / Crear un logo para la aplicacion que sea original y sea lindo a la vista / todo el dashboard de alimentos necesito que lo ordenes / y necesito que verifiques si todas las cuentas de calorias y todo se hacen bien y no tienen errores, es crucial para saber si estoy contando bien o no"
- **L2** (2026-10-29, user) Categories answer: "Origen (Recommended)" (chips Todos · Creados por mí · Favoritos · ARGENFOODS · Open Food Facts).
- **L3** UI map from the explorer: the add-food panel is `Sheet` (`src/components/ui/sheet.tsx`) hosted by `diary-screen-container.tsx`; no centered modal primitive exists; `search_foods` only filters by favorites; no read lists all insights; the logo is a lucide `Leaf` in `app-shell.tsx`.
- **L4** Audit result (delegated, read-only): no arithmetic bugs; BMR, TDEE, goal, floor, macros 4/4/9, age, portion scaling, rounding, SQL vs TS totals, time zone and Open Food Facts conversions verified with worked examples (479 tests passed). Design issues: (1) exercise counted twice (activity multiplier labels describe workouts and logged workouts are added again, with gross MET); (2) recipes have no cooked weight, so logging a cooked recipe by grams is off; (3) today's unfinished day counts in Progress averages; (4) editing only the meal re-computes an entry if its portion weight changed; (5) Today tiles can be 1 kcal off from rounding each tile.
- **L5** (2026-10-29, user) Exercise answer: "Nivel solo para vida diaria (Recommended)" — level labels describe daily life without workouts, logged exercise adds (MET − 1) × kg × h. Existing activity entries keep their stored kcal snapshot (gross MET) until edited.
- **L6** Assumptions applied: S4 freed space shows the day's target card (profile version and weight on that day); S5 lists every stored summary on /insights, today's card summary is not repeated in "Resúmenes anteriores"; S7 Foods screen = search + chips above results, barcode and Open Food Facts in a side card.

