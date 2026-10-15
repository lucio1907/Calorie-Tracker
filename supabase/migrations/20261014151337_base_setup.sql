-- Base setup shared by every table in this project.
--
-- Access model: single-user app. Every table lives in `public`, has RLS
-- enabled, and is granted only to `authenticated` (plus `service_role` for
-- server-side maintenance). `anon` gets nothing: unauthenticated Data API
-- requests are rejected by missing privileges before RLS is evaluated.

-- Do not auto-grant Data API roles on objects created later in `public`.
-- Matches Supabase's 2026 default (tables are no longer exposed
-- automatically); every table grants explicitly in its own migration.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, public;

-- Trigram matching for substring food-name search (ILIKE '%term%').
create extension if not exists pg_trgm with schema extensions;

-- Private schema for helpers that must never be reachable through the Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Keeps `updated_at` current on every UPDATE.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
