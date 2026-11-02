# usda-foods

Objective: add a curated USDA FoodData Central catalog of common natural foods (Spanish names, values per 100 g) as a new shared source next to ARGENFOODS.
Branch: feat/usda-foods (from development). Delivery: ask-on-risk. Test runner: vitest (unit), supabase test db (pgTAP), playwright (e2e).

## Specs

- S1. New shared source "usda" in the food catalog: the database accepts shared rows with source 'usda'; search, the source filter chip, the source badge and the food detail (attribution + link to the FDC food) support it. Existing sources keep their behavior.
- S2. A reproducible data pipeline: a committed curated selection (FDC id, Spanish name, group) and a script that builds `supabase/data/usda.csv` from the public-domain USDA FDC SR Legacy download, in the same column format as `argenfoods.csv` (code,name,group,kcal,protein,carbs,fat,fiber,sodium_mg; per 100 g; empty = not reported). Nothing is estimated.
- S3. An idempotent import script for `usda.csv` with the same safety as the ARGENFOODS import (prints the target host; a non-local host needs `--yes`; upsert on (source, external_code); never deletes).
- S4. The curated list: "~250 alimentos comunes" with Rioplatense Spanish names that fill what ARGENFOODS lacks (from the user-approved gap list: "matambre, entraña, carne picada, bondiola", "pechuga, muslo", "lechuga, zanahoria (solo jugo), morrón", "naranja, mandarina, kiwi, uva, arándano", "atún, salmón, pavo, quinoa, almendras"), without duplicating ARGENFOODS foods. Argentine cuts without an exact USDA equivalent use the closest USDA cut and note the mapping.
- S5. Production import only after explicit user authorization (remote write).

## Tasks

- [ ] T1 (S1) source "usda": migration + pgTAP, types, strings, badge, detail attribution/link, docs. Route: inline.
- [ ] T2 (S2, S3) extract + import scripts with unit tests. Route: inline.
- [ ] T3 (S4) curated selection, build usda.csv, import locally, verify search. Route: inline.
- [ ] T4 (S5) production import — pending user authorization.

## Log

- L1 (2026-11-02, user): "me gustaria que agregues a la base de datos productos naturales con valores en 100g, como por ejemplo verduras, cualquier tipo de carne, etc ya que si como un pedazo de carne lo tengo que agregar a mano y me saca mucho tiempo, asi que lo que quiero que hagas es que busques todos los alimentos naturales y los agregues a la base de datos con los valores nutricionales en 100g por producto"
- L2: Found 421 ARGENFOODS foods already in production, with gaps in common foods. Proposed USDA FDC (public domain) + curated ~250 Spanish-named list as a new source "usda"; production import needs explicit authorization.
- L3 (2026-11-02, user): "dale, avanzá con USDA y la lista curada"
