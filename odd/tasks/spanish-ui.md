# Spanish UI (Argentine voseo)

Objective: translate every user-visible text and locale format from English to Argentine Spanish. Branch: `feat/spanish-ui` (from `development`). Delivery: ask-on-risk. Test runner: Vitest (`npx vitest run`) + Playwright (`npm run test:e2e`).

## Specs

- **S1** — "ahora necesito que la aplicacion la pases a español ya que los productos de la base de datos son argentinos y estan en español, para que no haya 2 lenguajes distintos". Every user-visible string (the `src/features/*/strings.ts` files, page metadata, built-in component text) is in Spanish.
- **S2** — Register: "voseo argentino". Sentences addressed to the user use voseo ("Ingresá un número.", "Probá de nuevo."). Buttons use the infinitive ("Guardar", "Eliminar"). Follow the glossary below.
- **S3** — Locale formats are `es-AR`: dates ("martes, 27 de octubre"), numbers (decimal comma), React Aria built-in text (calendar, select), `<html lang="es">`. *Assumption: implied by S1.*
- **S4** — The shared activity catalog (30 English rows in `public.activities`, seeded locally by `supabase/seed.sql` and once on hosted) is in Spanish. Past `activity_entries.label` snapshots that still equal the English catalog name are translated as well. *Assumption: implied by "para que no haya 2 lenguajes distintos".* Applying the migration to hosted needs explicit user authorization.
- **S5** — Every test (unit + E2E) that asserts English copy or en-US formats is updated; the full suite passes.

### Glossary (single source for every unit)

| English | Spanish |
|---|---|
| Calorie Tracker (app name) | Contador de calorías |
| Today / Diary / Activity / Foods / Progress / Settings | Hoy / Diario / Actividad / Alimentos / Progreso / Ajustes |
| Log food (button) / Log (tab) | Registrar comida / Registrar |
| Log weight / Log activity | Registrar peso / Registrar actividad |
| Breakfast / Lunch / Snack / Dinner / Extra | Desayuno / Almuerzo / Merienda / Cena / Extra |
| Energy / Protein / Carbs, Carbohydrates / Fat / Fiber / Sodium | Energía / Proteínas / Carbohidratos / Grasas / Fibra / Sodio |
| short P / C / F | P / C / G |
| kcal, g, mg, kg, min, MET, TDEE | unchanged |
| BMR | metabolismo basal |
| Target (kcal) / Daily target | Objetivo / Objetivo diario |
| Goal (weight goal) / Lose / Maintain / Gain weight | Meta / Bajar de peso / Mantener el peso / Subir de peso |
| Food (equation) / food (catalog item) | Comida / alimento |
| Exercise / Weight | Ejercicio / Peso |
| entry (diary/activity/weight) | registro |
| Portion / serving | Porción / porción |
| Recipe / Ingredient | Receta / Ingrediente |
| Favorites / Barcode | Favoritos / Código de barras |
| Profile / Account | Perfil / Cuenta |
| Sign in / Sign out | Iniciar sesión / Cerrar sesión |
| Two-factor authentication / authenticator app / code | Verificación en dos pasos / app de autenticación / código |
| Save / Saving… / Save changes | Guardar / Guardando… / Guardar cambios |
| Delete / Deleting… / Cancel / Close / Add / Edit | Eliminar / Eliminando… / Cancelar / Cerrar / Agregar / Editar |
| Required. | Obligatorio. |
| Enter a number. | Ingresá un número. |
| Check the highlighted fields. | Revisá los campos marcados. |
| Your session expired. Sign in again. | Tu sesión expiró. Iniciá sesión de nuevo. |
| Something went wrong. Try again. | Algo salió mal. Probá de nuevo. |
| Could not save X. Try again. | No se pudo guardar X. Probá de nuevo. |
| This X no longer exists. | Este/a X ya no existe. |
| Today / Yesterday / Tomorrow (relative day) | Hoy / Ayer / Mañana |
| Sex / Male / Female | Sexo / Masculino / Femenino |
| Page titles (h1) | the nav names above (Hoy, Diario, Actividad, Alimentos, Progreso, Ajustes; Recetas) |
| Height (cm) / Previous day / Next day / Pick a date | Altura (cm) / Día anterior / Día siguiente / Elegir una fecha |
| Dates and numbers | come from the `es-AR` formatters ("miércoles, 14 de octubre", "14 oct", "4,1"); never hardcode them in copy |

## Tasks

| ID | Specs | Scope | Route | Status | Commit |
|---|---|---|---|---|---|
| T1 | S1-S3, S5 | Locale base (Intl `es-AR`, 4 `I18nProvider`, `lang`, layout metadata, calendar "Year", `localeCompare`), shell + auth strings, `e2e/global-setup.ts`, login/sign-out/instant-navigation E2E, shared date tests | inline (others depend on it) | done (unit green for its files; E2E at T7) | T1 commit |
| T2 | S1, S2, S5 | settings strings + tests + settings/two-factor E2E | delegated (parallel unit) | pending | |
| T3 | S1, S2, S5 | today + progress strings + tests + E2E | delegated (parallel unit) | pending | |
| T4 | S1, S2, S5 | diary + activity strings + tests + E2E (catalog names come from T6) | delegated (parallel unit) | pending | |
| T5 | S1, S2, S5 | foods + recipes strings + tests + E2E | delegated (parallel unit) | pending | |
| T6 | S4, S5 | activity catalog: `seed.sql` + migration (catalog rows by `compendium_code`, matching entry labels) + activity-search test; Risk item 1 | inline, own commit, independent verifier | pending | |
| T7 | S5 | seam check: full unit suite, E2E both projects, lint, typecheck, 390px screenshots | inline | pending | |

## Log

- **L1** (2026-10-27, user): "ahora necesito que la aplicacion la pases a español ya que los productos de la base de datos son argentinos y estan en español, para que no haya 2 lenguajes distintos"
- **L2** (2026-10-27, user, answering "voseo argentino o español neutro"): "voseo argentino"
- **L3** Exploration: strings centralized in 9 `strings.ts` (~750 lines); `en-US` hardcoded in 4 React Aria `I18nProvider`s and Intl formatters (diary-date, foods/format, progress/format, settings/weight-entry, today-view); 30 English activity names in `supabase/seed.sql` (also seeded on hosted); E2E never imports Strings and `e2e/global-setup.ts` logs in with English labels; ~10 unit tests assert en-US dates.
- **L4** Route: T1 inline first because every unit's tests depend on the new formats and the login labels. T2-T5 are independent units with disjoint edit surfaces (their own `strings.ts`, components, unit tests and E2E specs), launched together as parallel writers (Writer trigger a). Writers run unit tests and typecheck only; the parent runs E2E once at T7 (shared local Supabase and port).
- **L5** T1 done: dates lowercase mid-sentence ("miércoles, 14 de octubre"); standalone labels (DateNav, PageHeader description, weight list) capitalize with `first-letter:uppercase`. Decimal input already accepts commas (`toDecimal` in food-schema). Remaining unit failures (9 files) belong to T2-T5. Removed a stray `console.log` in date-picker.test.
