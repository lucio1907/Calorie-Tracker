# Food data

Where the nutrition data comes from, what you may do with it, and how to change the catalog.

## Sources at a glance

| Source | What it covers | License | Stored as |
|--------|----------------|---------|-----------|
| [ARGENFOODS](https://www.argenfood.unlu.edu.ar/) (Universidad Nacional de Luján) | 421 generic Argentine foods | Non-commercial use with attribution | Shared catalog, `supabase/data/argenfoods.csv` |
| [USDA FoodData Central](https://fdc.nal.usda.gov/) (SR Legacy) | 205 common natural foods ARGENFOODS lacks | Public domain (CC0 1.0); citation requested | Shared catalog, `supabase/data/usda.csv` |
| [Open Food Facts](https://world.openfoodfacts.org/) | Packaged products (barcode lookup and name search, Argentina) | ODbL | The user's own food, only when looked up or picked |
| You | Anything else | — | The user's own food (`custom`) |

All values are **per 100 g of edible portion**. The app cites the source on every food and links to it.

## Shared catalogs

ARGENFOODS and USDA foods are **shared rows** (`owner_id` is null): every user can read them, and only the service key can write them. They are loaded with the import scripts:

```bash
npm run foods:import-argenfoods
npm run foods:import-usda
```

Both scripts are idempotent: they match on `(source, external_code)`, update values in place, and never delete a food, because diary entries and recipes may reference it.

### ARGENFOODS

- Generic Argentine foods as published by the Universidad Nacional de Luján, with their Spanish names.
- `scripts/extract-argenfoods.mjs` documents how the CSV was produced from the group spreadsheets and per-food pages. Rows whose declared energy contradicts their macros were skipped, not corrected.
- **Terms:** non-commercial use is authorized as long as the authors, the copyright holder (UNLu) and the full reference are cited. Commercial use needs written permission from UNLu.

### USDA FoodData Central

Fills the gaps in ARGENFOODS:

| Group | Examples |
|-------|----------|
| Beef | carne picada (25, 15, 10 and 5 % fat), matambre, entraña, bife de chorizo, ojo de bife, osobuco, offal |
| Pork, lamb | bondiola, solomillo, pechito, pernil, cordero |
| Poultry | chicken breast, thigh, drumstick and wing (with and without skin), turkey |
| Fish and seafood | tuna (fresh and canned), salmon, trout, cod, tilapia, octopus |
| Vegetables | five kinds of lettuce, carrot, peppers, mushrooms, zucchini, butternut squash |
| Fruit | orange, mandarin, kiwi, grapes, blueberries, mango, dried fruit |
| Legumes, nuts, seeds | cooked lentils and beans, tofu, almonds, cashews, chia, flax |
| Grains | cooked quinoa, brown rice, pasta, couscous, bulgur |

Most foods come both raw and cooked.

**How the list is built.** `supabase/data/usda-selection.csv` is the curated list. Each row has the FDC id, our Spanish name, the group and the original USDA description, so every mapping can be reviewed side by side.

**Approximations.** Argentine cuts without an exact USDA equivalent use the closest one:

| Our name | USDA cut |
|----------|----------|
| Matambre | Flank steak |
| Bondiola (raw) | Whole pork shoulder |
| Pecho | Brisket, flat half |

**Things to know:**

- Carbohydrates are "by difference", so fiber is included.
- Foods already in ARGENFOODS were left out.
- Foods whose energy contradicts their macros are skipped, not corrected.
- **Terms:** public domain, no permission needed. USDA asks to be cited as the source, which the app does on every USDA food.

## Changing the USDA catalog

1. Download and unzip [FoodData_Central_sr_legacy_food_csv_2018-04.zip](https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip).
2. Edit `supabase/data/usda-selection.csv`: add the FDC id, a Spanish name, the group, and the USDA description exactly as it appears in `food.csv`.
3. Rebuild the CSV:

   ```bash
   node scripts/extract-usda.mjs <unzipped-folder>
   ```

   It fails without writing anything if an id is unknown or its description doesn't match the one you wrote, which catches mistyped ids.
4. Import locally (`npm run foods:import-usda`), search for the new foods in the app, and commit both CSV files.

> [!NOTE]
> Removing a row from the CSV does not remove the food from a database where it was already imported, because the import never deletes. Delete it there by hand if nothing references it.
