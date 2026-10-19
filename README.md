# Calorie Tracker

Personal, single-user calorie tracker. Next.js 16 (App Router) on Vercel + Supabase (Postgres, Auth, RLS).

## Local setup

```bash
npm ci
npx supabase start              # local stack (Docker); prints URLs and keys
cp .env.example .env.local      # fill with values from `npx supabase status`
npm run user:create -- --email owner@local.test   # prints a generated password
npm run foods:import-argenfoods                    # shared ARGENFOODS catalog (run after every db reset)
npm run dev                     # http://localhost:3000
```

| Service | URL |
|---------|-----|
| API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Mailpit | http://127.0.0.1:54324 |

## Creating the owner account

Public sign-ups are disabled (`[auth] enable_signup = false`), so the only account is created with
`scripts/create-user.mjs`, which calls the Auth admin API:

```bash
npm run user:create -- --email you@example.com [--password 'Str0ngPassphrase']
```

It reads `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` from the
shell or `.env.local`. Locally the key is the **Secret** key from `npx supabase status`; in
production use the project's secret key. Never give it a `NEXT_PUBLIC_` prefix. Without
`--password`, a random password (12+ chars, upper/lower/digit) is generated and printed once.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest (domain calculators + components) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npx supabase db reset` | Re-applies migrations and `supabase/seed.sql` |
| `npm run foods:import-argenfoods` | Upserts `supabase/data/argenfoods.csv` as shared foods (service key; idempotent) |
| `npx supabase db advisors --local` | Security/performance lints |
| `npx supabase test db` | pgTAP RLS proofs in `supabase/tests/` (rolled back; needs the local stack) |
| `npm run test:e2e` | Playwright E2E (mobile + desktop Chromium); builds, starts `next start` on :3210 |

## End-to-end tests

`e2e/*.spec.ts` drive a production build against the local Supabase stack (`npx supabase start`,
seeded activities; no food import needed). Global setup creates two dedicated accounts
(`e2e-mobile@local.test`, `e2e-desktop@local.test`) with the Auth admin API, signs each in through
the login form and saves the session; every test starts by deleting that account's data, so the
owner account is never touched. The service key comes from `SUPABASE_SERVICE_ROLE_KEY` or, when
unset, from `npx supabase status`; setup refuses any non-local Supabase URL.

```bash
npx playwright install chromium   # once
npm run test:e2e                  # E2E_SKIP_BUILD=1 reuses the last build
npx playwright show-report
```

Full-page screenshots of each screen land in `test-results/screenshots/<project>/` (records, not
pixel assertions). CI runs the same suite in the `e2e` job and uploads screenshots and the report.

## Food data

- **ARGENFOODS** (Universidad Nacional de Luján, https://www.argenfood.unlu.edu.ar/): generic Argentine
  foods, per 100 g, in `supabase/data/argenfoods.csv`. Non-commercial use with attribution is allowed by
  its terms; the app cites the source on every ARGENFOODS food. `scripts/extract-argenfoods.mjs`
  documents how the CSV was produced.
- **Open Food Facts** (ODbL): packaged products, fetched server-side only (barcode lookup and name search
  limited to Argentina). A product is stored as the user's own food only when looked up or picked.

## Layout

```
src/
  app/            thin routes: (auth)/login, (app)/{today,diary,activity,foods,progress,settings}
  features/<name> screaming architecture: components (presentational), containers (client wiring),
                  actions (Server Actions), data (server-only reads), strings.ts (UI copy)
  components/ui   shared atoms (Button, TextField, Card, PageHeader, EmptyState)
  domain/         pure calculators: BMR, TDEE/target, exercise kcal, daily balance
  lib/supabase/   browser, server and proxy clients
  proxy.ts        session refresh + optimistic auth redirect
supabase/         config.toml, migrations, seed.sql (MET activities)
```
