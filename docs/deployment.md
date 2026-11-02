# Deployment

The app runs on **Vercel** (Next.js) and **Supabase** (Postgres + Auth). Vercel deploys the code automatically. Database migrations and catalog imports are **manual**, on purpose.

## Branches

| Branch | Role |
|--------|------|
| `feat/*`, `fix/*`, `docs/*` | Work branches, merged into `development` through a pull request. |
| `development` | Integration branch. CI must be green before merging. |
| `main` | Production. Vercel deploys every push to `main`. |

## Releasing a change

1. Open a pull request from `development` to `main` and wait for CI.
2. If the release adds migrations, apply them to production **before or right after** merging (see below). The release's PR description says when the order matters.
3. Merge. Vercel builds and deploys `main`.
4. If the release changes a food catalog CSV, import it into production (see below).
5. Smoke-test the production URL: sign in, open **Hoy**, search for a food.

## Applying migrations to production

Run these from your machine. `<session-pooler-url>` is the **Session pooler** connection string from the Supabase dashboard (Project Settings → Database):

```bash
npx supabase test db                                       # local pgTAP must pass first
npx supabase db push --dry-run --db-url "<session-pooler-url>"   # lists what would run
npx supabase db push --db-url "<session-pooler-url>"             # applies it
```

> [!CAUTION]
> Migrations are forward-only. Never edit or delete a migration that already ran in production; write a new one instead.

## Importing food catalogs into production

The import scripts write with the service key, so they refuse any non-local host unless you pass `--yes`:

```bash
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<production secret key>" \
npm run foods:import-usda -- --yes
```

- The script prints the target host before writing. Check it.
- Running it again is safe: rows are updated in place, never duplicated or deleted.
- The same applies to `foods:import-argenfoods`.

## Production configuration

| Where | Setting |
|-------|---------|
| Vercel env | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `OPENROUTER_API_KEY` (Production and Preview) |
| Supabase Auth | Sign-ups disabled, anonymous sign-ins off, email provider on |
| Supabase API | Realtime, Storage and `graphql_public` turned off (unused) |
| Owner account | Created once with `npm run user:create` against production (see [Development](development.md#owner-account)) |

> [!IMPORTANT]
> `SUPABASE_SERVICE_ROLE_KEY` never goes to Vercel: the app doesn't use it. Only the operator scripts need it, from your machine.
