# AI insights

The **Resumen con IA** screen summarizes how the selected period (7, 30 or 90 days) went and what to improve, and answers four predefined questions. It uses free [OpenRouter](https://openrouter.ai) models, so it costs nothing.

## Setup

1. Create a free key at https://openrouter.ai/keys. No credits are needed.
2. Set `OPENROUTER_API_KEY` in `.env.local`, and in Vercel for Production and Preview.
3. Open **Progreso → Resumen con IA** and tap **Generar resumen**.

> [!WARNING]
> The key is server-only. Never give it a `NEXT_PUBLIC_` prefix.

Without a key, generating shows an error and the rest of the app keeps working.

## How it works

| Topic | Behavior |
|-------|----------|
| **Models** | Only `:free` models: `nvidia/nemotron-3.5-lightning:free` first, `google/gemma-4-26b-a4b-it:free` as the fallback (`INSIGHT_MODELS` in `src/features/insights/data/openrouter.ts`). |
| **Summaries** | One per user, range and day, stored in `public.insights`. A reload shows the stored one without calling the model again. |
| **Questions** | Weight change, protein, weekends and logging consistency. Each answer is stored in `insight_answers`, one per question, range and day, so asking again the same day costs nothing. |
| **Empty ranges** | A range without logged food never calls the model. |

## Limits

- **OpenRouter free tier:** 20 requests per minute and 50 per day per account (1,000 per day once 10 credits were ever bought). The limit is shared by every user of the deployment.
- **Per user:** at most 50 generation attempts per app day, failed ones included (`consume_insight_request`). Summaries and answers share this count.

The app has one user and sign-ups are closed. If sign-ups ever open, lower the per-user limit so one account can't spend the whole deployment's quota.

## Privacy

Free providers may log prompts, so **only aggregated numbers are sent**: averages, day counts, weight trend, goal direction, and macros against targets. Your name, email, birth date and food names are never sent.
