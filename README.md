<div align="center">

# Calorie Tracker

**A personal calorie and macro tracker built for Argentine food: log meals in seconds, see your daily budget, and track your progress.**

[![CI](https://github.com/lucio1907/Calorie-Tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/lucio1907/Calorie-Tracker/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3FCF8E?logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

</div>

Single-user app (sign-ups are closed). The UI is in Spanish (Argentina); this documentation is in English.

## Features

| Screen | What you can do |
|--------|-----------------|
| **Hoy** (Today) | See how many calories you have left today, your target breakdown (TDEE, food, exercise) and your macros. |
| **Diario** (Diary) | Log food by meal for any day, pick from recent foods, copy a day's entries to another day. |
| **Actividad** (Activity) | Log exercise from a MET catalog; burned calories are added to the day's budget. |
| **Alimentos** (Foods) | Search 626 shared foods (421 from ARGENFOODS, 205 from USDA), scan a barcode, import packaged products from Open Food Facts, or create your own foods and portions. |
| **Recetas** (Recipes) | Combine foods into recipes and log them by serving. |
| **Progreso** (Progress) | Weight trend and history, daily calorie balance over 7, 30 or 90 days. |
| **Resumen con IA** (AI insights) | A free AI summary of the period and answers to four predefined questions, from aggregated numbers only. |
| **Ajustes** (Settings) | Body data, weight goal and pace, macro split, and two-factor authentication. |

Targets use Mifflin-St Jeor for the basal metabolic rate and net MET calories for exercise.

## Tech stack

| Layer | Choice |
|-------|--------|
| App | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| UI | Tailwind CSS 4, React Aria Components, Lucide icons |
| Data | Supabase: Postgres with Row Level Security, Auth (email + TOTP 2FA) |
| Validation | Zod |
| Tests | Vitest + Testing Library, pgTAP, Playwright (mobile + desktop) |
| Hosting | Vercel + Supabase (São Paulo region) |

## Quick start

Requirements: **Node.js 22+** and **Docker** (for the local Supabase stack).

```bash
npm ci
npm run db:start                                   # local Supabase on 127.0.0.1; prints URLs and keys
cp .env.example .env.local                         # fill in with the values from `npx supabase status`
npm run user:create -- --email owner@local.test    # creates the only account; prints its password
npm run foods:import-argenfoods                    # shared food catalogs
npm run foods:import-usda
npm run dev                                        # http://127.0.0.1:3000
```

Sign in with the account you just created. To check that everything works, run `npm test`.

## Documentation

| Guide | Read it when you want to… |
|-------|---------------------------|
| [Development](docs/development.md) | Set up the local stack, use the scripts, run the tests. |
| [Architecture](docs/architecture.md) | Understand the folder layout, data flow and security model. |
| [Food data](docs/food-data.md) | Learn where the food catalog comes from, its licenses, and how to change it. |
| [AI insights](docs/ai-insights.md) | Configure the OpenRouter key and understand limits and privacy. |
| [Deployment](docs/deployment.md) | Ship to Vercel + Supabase, apply migrations, import data in production. |

## Data sources

Nutrition data comes from [ARGENFOODS](https://www.argenfood.unlu.edu.ar/) (Universidad Nacional de Luján),
[USDA FoodData Central](https://fdc.nal.usda.gov/) (public domain) and [Open Food Facts](https://world.openfoodfacts.org/) (ODbL).
The app cites the source on every food. See [Food data](docs/food-data.md) for the terms of each one.
