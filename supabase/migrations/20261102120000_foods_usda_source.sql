-- USDA source: the shared catalog gains foods from USDA FoodData Central
-- (SR Legacy, public domain), imported by scripts/import-usda.mjs with
-- source 'usda' and the FDC id as external_code.
--
-- Only the allowed values of foods.source change. Existing rows already
-- satisfy the new check (it is a superset), and the table is small, so the
-- constraint is replaced in one step.

alter table public.foods
  drop constraint foods_source_check,
  add constraint foods_source_check check (source in ('argenfoods', 'usda', 'off', 'custom'));

comment on column public.foods.external_code is
  'Identifier in the source catalog (ARGENFOODS food number, USDA FDC id). Shared rows only.';
