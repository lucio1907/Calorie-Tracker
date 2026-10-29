# Calorie Tracker

Personal, single-user calorie tracker. Next.js 16 (App Router) on Vercel + Supabase (Postgres, Auth, RLS).

## Local setup

```bash
npm ci
npm run db:start                # local stack (Docker), ports on 127.0.0.1 only; prints URLs and keys
cp .env.example .env.local      # fill with values from `npx supabase status`
npm run user:create -- --email owner@local.test   # prints a generated password
npm run foods:import-argenfoods                    # shared ARGENFOODS catalog (run after every db reset)
npm run dev                     # http://127.0.0.1:3000 (loopback only)
```

| Service | URL |
|---------|-----|
| API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Mailpit | http://127.0.0.1:54324 |

### Local network exposure

A plain `npx supabase start` publishes the stack's ports (54321-54327) on every interface, so any
peer on the same network could reach Studio and Mailpit (no auth) and Postgres (default
credentials). `npm run db:start` (`scripts/supabase-start.mjs`) instead starts it on a Docker
network whose default host binding is 127.0.0.1, as the
[Supabase local development guide](https://supabase.com/docs/guides/local-development) recommends.
The network keeps the CLI's default name, so `npx supabase test db` and `npx supabase db reset`
use it too. If the stack is already running from a plain start, run `npx supabase stop` first.
Check with `ss -ltn | grep ':543'`: every listener should be on 127.0.0.1. When you do not need
Studio or Mailpit, skip them: `npm run db:start -- -x studio,mailpit,logflare,postgres-meta`.

## Creating the owner account

Public sign-ups are disabled (`[auth] enable_signup = false`), so the only account is created with
`scripts/create-user.mjs`, which calls the Auth admin API:

```bash
npm run user:create -- --email you@example.com                     # generates a password
pass show calorie-tracker | npm run user:create -- --email you@example.com --password-stdin
```

It reads `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` from the
shell or `.env.local`. Locally the key is the **Secret** key from `npx supabase status`; in
production use the project's secret key. Never give it a `NEXT_PUBLIC_` prefix. Without
`--password-stdin`, a random password (12+ chars, upper/lower/digit) is generated and printed once.
With it, the password is read from stdin (pipe it in from a password manager or a file), so it
never appears in the process list or the shell history; there is no `--password <value>` flag.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest (domain calculators + components) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npx supabase db reset` | Re-applies migrations and `supabase/seed.sql` |
| `npm run foods:import-argenfoods` | Upserts `supabase/data/argenfoods.csv` as shared foods (service key; idempotent). Prints the target host; a non-local one needs `-- --yes` |
| `npx supabase db advisors --local` | Security/performance lints |
| `npx supabase test db` | pgTAP RLS proofs in `supabase/tests/` (rolled back; needs the local stack) |
| `npm run test:e2e` | Playwright E2E (mobile + desktop Chromium); builds, starts `next start` on :3210 |

## End-to-end tests

`e2e/*.spec.ts` drive a production build against the local Supabase stack (`npm run db:start`,
seeded activities; no food import needed). Global setup creates two dedicated accounts
(`e2e-mobile@local.test`, `e2e-desktop@local.test`) with the Auth admin API, signs each in through
the login form and saves the session; every test starts by deleting that account's data, so the
owner account is never touched. The service key comes from `SUPABASE_SERVICE_ROLE_KEY` or, when
unset, from `npx supabase status`; setup refuses any non-local Supabase URL.

`e2e/instant-navigation.spec.ts` uses `instant()` from `@next/playwright` to assert that every
screen paints its shell (heading + skeleton) before per-user data arrives, on a direct load and on
a client navigation. It needs a build made with `EXPOSE_TESTING_API=1` (the npm script sets it;
`next start` gets it from `playwright.config.ts`), so a reused `E2E_SKIP_BUILD=1` build must come
from `npm run test:e2e` too. Never set it for a deployment.

```bash
npx playwright install chromium   # once
npm run test:e2e                  # E2E_SKIP_BUILD=1 reuses the last build
npx playwright show-report
```

Full-page screenshots of each screen land in `test-results/screenshots/<project>/` (records, not
pixel assertions). CI runs the same suite in the `e2e` job and uploads the screenshots; the report
and traces (which hold the E2E users' session cookies) are uploaded only when a test fails, and
kept for 7 days.

## Food data

- **ARGENFOODS** (Universidad Nacional de Luján, https://www.argenfood.unlu.edu.ar/): generic Argentine
  foods, per 100 g, in `supabase/data/argenfoods.csv`. Non-commercial use with attribution is allowed by
  its terms; the app cites the source on every ARGENFOODS food. `scripts/extract-argenfoods.mjs`
  documents how the CSV was produced.
- **Open Food Facts** (ODbL): packaged products, fetched server-side only (barcode lookup and name search
  limited to Argentina). A product is stored as the user's own food only when looked up or picked.

## AI summaries

Progress has a **Resumen con IA** card: "Generar resumen" asks a free [OpenRouter](https://openrouter.ai)
model how the selected range (7, 30 or 90 days) went and what to improve. One summary per user, range
and day is stored in `public.insights` and shown again on reload without a new call.

- **Key**: set `OPENROUTER_API_KEY` in `.env.local` (and in Vercel for Production and Preview). It is
  server-only: never prefix it with `NEXT_PUBLIC_`. Create a free key at https://openrouter.ai/keys; no
  credits are needed. Without it, generating shows an error and the rest of Progress still works.
- **Models**: only `:free` models, which cost nothing: `nvidia/nemotron-3.5-lightning:free` first, then
  `google/gemma-4-26b-a4b-it:free` as the fallback (`INSIGHT_MODELS` in
  `src/features/insights/data/openrouter.ts`).
- **Limits**: OpenRouter's free tier allows 20 requests per minute and 50 per day per account (1000 per
  day once 10 credits were ever bought), shared by every user of the deployment. Each user gets at most
  10 generation attempts per day, failed ones included (`consume_insight_request`, app time zone);
  stored summaries are one per range and day, and a range without logged food
  never calls the model.
- **Privacy**: free providers may log prompts. Only aggregated numbers are sent (averages, day counts,
  weight trend, goal direction, macros vs. targets); never the name, email, birth date or food names.

## Layout

```
src/
  app/            thin routes: (auth)/login, (app)/{today,diary,activity,foods,progress,settings}
  features/<name> screaming architecture: components (presentational), containers (client wiring),
                  actions (Server Actions), data (server-only reads), strings.ts (UI copy)
  components/ui   shared atoms (Button, TextField, Card, PageHeader, EmptyState)
  domain/         pure calculators: BMR, TDEE/target, exercise kcal, daily balance
  lib/supabase/   server and proxy clients (the browser never talks to Supabase)
  proxy.ts        session refresh + optimistic auth redirect
supabase/         config.toml, migrations, seed.sql (MET activities)
```
