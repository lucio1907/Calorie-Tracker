# Development

How to run the app locally, what each script does, and how the test suites work.

**Contents:** [Local setup](#local-setup) · [Owner account](#owner-account) · [Environment variables](#environment-variables) · [Scripts](#scripts) · [Tests](#tests) · [Continuous integration](#continuous-integration)

## Local setup

Requirements: Node.js 22+ and Docker.

1. Install dependencies: `npm ci`.
2. Start the local Supabase stack: `npm run db:start`. It applies every migration and `supabase/seed.sql` (the activity catalog), then prints the URLs and keys.
3. Create `.env.local` from `.env.example` and fill it in with the values from `npx supabase status`.
4. Create the owner account: `npm run user:create -- --email owner@local.test`.
5. Import the shared food catalogs: `npm run foods:import-argenfoods` and `npm run foods:import-usda`. Run both again after every `npx supabase db reset`.
6. Start the app: `npm run dev`, then open http://127.0.0.1:3000.

| Local service | URL |
|---------------|-----|
| App | http://127.0.0.1:3000 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| Mailpit (auth emails) | http://127.0.0.1:54324 |

> [!IMPORTANT]
> Start the stack with `npm run db:start`, not `npx supabase start`. A plain start publishes ports 54321-54327 on **every** network interface, so anyone on your network could reach Studio and Mailpit (no auth) and Postgres (default credentials).

<details>
<summary>How <code>db:start</code> keeps the stack on loopback</summary>

`scripts/supabase-start.mjs` starts the stack on a Docker network whose default host binding is 127.0.0.1, as the [Supabase local development guide](https://supabase.com/docs/guides/local-development) recommends. The network keeps the CLI's default name, so `npx supabase test db` and `npx supabase db reset` use it too.

- If the stack is already running from a plain start, run `npx supabase stop` first.
- Check with `ss -ltn | grep ':543'`: every listener should be on 127.0.0.1.
- To skip the services you don't need: `npm run db:start -- -x studio,mailpit,logflare,postgres-meta`.
- `npm run dev` also binds to 127.0.0.1 only.

</details>

## Owner account

Public sign-ups are disabled (`[auth] enable_signup = false`), so the only account is created with `scripts/create-user.mjs`, which calls the Auth admin API:

```bash
npm run user:create -- --email you@example.com                                     # generates a password
pass show calorie-tracker | npm run user:create -- --email you@example.com --password-stdin
```

- **Without `--password-stdin`**, it generates a random password (12+ characters, upper, lower and digit) and prints it once.
- **With `--password-stdin`**, it reads the password from stdin, so it never appears in the process list or the shell history. There is no `--password <value>` flag on purpose.

## Environment variables

Set them in `.env.local` (git-ignored). The scripts read the same file.

| Variable | Used by | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | App | Supabase API URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | App | Publishable key. RLS decides what each user can read and write. |
| `SUPABASE_SERVICE_ROLE_KEY` | Scripts, E2E setup | Secret key that bypasses RLS. Server-side only. Never give it a `NEXT_PUBLIC_` prefix. |
| `SUPABASE_URL` | Scripts | Optional. Overrides `NEXT_PUBLIC_SUPABASE_URL` for the scripts. |
| `OPENROUTER_API_KEY` | AI insights | Optional and server-only. See [AI insights](ai-insights.md). |

Locally, the secret key is the **Secret** key printed by `npx supabase status`.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Next.js dev server on 127.0.0.1:3000. |
| `npm run build` / `npm start` | Production build and server. |
| `npm test` | Unit and component tests (Vitest). `npm run test:watch` for watch mode. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `next typegen` + `tsc --noEmit`. |
| `npm run test:e2e` | Playwright E2E (mobile + desktop). `test:e2e:ui` opens the UI mode. |
| `npm run db:start` | Local Supabase on loopback (see above). |
| `npm run user:create` | Creates the owner account. |
| `npm run foods:import-argenfoods` | Upserts `supabase/data/argenfoods.csv` as shared foods. |
| `npm run foods:import-usda` | Upserts `supabase/data/usda.csv` as shared foods. |
| `npm run audit:all` | `npm audit` of every dependency, with dated waivers. |
| `npx supabase db reset` | Re-applies migrations and the seed. Wipes local data. |
| `npx supabase test db` | pgTAP database tests in `supabase/tests/`. |
| `npx supabase db advisors --local` | Supabase security and performance lints. |

The import scripts are idempotent: they match rows on `(source, external_code)`, update them in place and never delete. They print the target host and refuse any non-local one unless you pass `-- --yes`.

## Tests

| Suite | Command | What it covers |
|-------|---------|----------------|
| Unit and component | `npm test` | Domain calculators, schemas, hooks, components and containers, Server Actions, scripts. |
| Database | `npx supabase test db` | Migrations, RLS policies, grants, quotas, throttles and RPCs. Each file runs in a transaction that is rolled back. Needs the local stack. |
| End-to-end | `npm run test:e2e` | Every screen on a production build, in mobile and desktop Chromium. |

### End-to-end tests

```bash
npx playwright install chromium   # once
npm run test:e2e                  # E2E_SKIP_BUILD=1 reuses the last build
npx playwright show-report
```

- **Isolated accounts.** Global setup creates two dedicated accounts (`e2e-mobile@local.test`, `e2e-desktop@local.test`) with the Auth admin API, signs each one in through the login form and saves the session. Every test starts by deleting that account's data, so the owner account is never touched.
- **Local only.** The service key comes from `SUPABASE_SERVICE_ROLE_KEY` or, when unset, from `npx supabase status`. Setup refuses any non-local Supabase URL.
- **No food import needed.** The tests seed what they use.
- **Instant navigation.** `e2e/instant-navigation.spec.ts` uses `instant()` from `@next/playwright` to assert that every screen paints its shell (heading + skeleton) before per-user data arrives. It needs a build made with `EXPOSE_TESTING_API=1`, which the npm script sets. A reused `E2E_SKIP_BUILD=1` build must also come from `npm run test:e2e`. **Never set `EXPOSE_TESTING_API` for a deployment.**
- **Screenshots.** Full-page screenshots of each screen are saved to `test-results/screenshots/<project>/`. They are records, not pixel assertions.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request:

| Job | Checks |
|-----|--------|
| `lint` | ESLint |
| `typecheck` | `next typegen` + `tsc` |
| `test` | Vitest |
| `audit` | `npm audit` (high severity) |
| `build` | `next build` (after lint, typecheck and test) |
| `database` | Starts Postgres, applies the migrations, runs pgTAP |
| `e2e` | Local Supabase + production build + Playwright, mobile and desktop |

The E2E job uploads the screenshots. It uploads the report and traces only when a test fails and keeps them for 7 days, because traces hold the E2E users' session cookies.

`.github/workflows/audit.yml` also runs a dependency audit every Monday at 09:00 (Buenos Aires).
