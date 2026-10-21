-- Privilege hygiene.
--
-- 1. Functions fail closed. Postgres grants EXECUTE to PUBLIC on every new
--    function, so a migration that forgot its `revoke ... from public` would
--    expose the function to anon and authenticated through the Data API.
--    Every existing migration revokes explicitly; this makes it the default
--    for functions postgres creates from now on, in any schema. Existing
--    functions keep their current (explicit) grants.

alter default privileges for role postgres revoke execute on functions from public;

-- 2. Profiles: column-level UPDATE. Signed-in users only need to update the
--    columns the Settings form writes. Its upsert (PostgREST: INSERT ... ON
--    CONFLICT DO UPDATE SET <every payload column>) names user_id too, so
--    user_id keeps UPDATE; RLS's WITH CHECK still pins it to auth.uid().
--    created_at and updated_at are left out: only the default and the
--    profiles_set_updated_at trigger write them.

revoke update on table public.profiles from authenticated;

grant update (
  user_id,
  sex,
  birth_date,
  height_cm,
  activity_level,
  goal,
  goal_kg_per_week,
  protein_g_per_kg,
  carbs_share_pct,
  fat_share_pct
) on table public.profiles to authenticated;
