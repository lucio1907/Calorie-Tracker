-- Drop public.copy_food_entries().
--
-- The RPC (added in 20261014162320_diary_support.sql) is not called by the app,
-- yet it was granted to every signed-in user. Each call copies a whole day of
-- the caller's entries in one statement, so a handful of calls could multiply
-- that user's diary rows geometrically. Removing it closes that path; copying
-- a day can come back later as a bounded, app-driven feature.

drop function if exists public.copy_food_entries(date, date, text);
