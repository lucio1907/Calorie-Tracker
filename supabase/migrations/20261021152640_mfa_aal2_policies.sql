-- Two-factor (TOTP) enforcement in the database.
--
-- The app asks for the second factor after the password, but Supabase's Auth
-- API is public: anyone holding the password can sign in against Auth
-- directly, get an aal1 access token and query the Data API without ever
-- seeing the app. So the rule lives here. Once a user has a verified MFA
-- factor, every table holding user data requires an aal2 session (password
-- plus second factor). Users without a verified factor keep working at aal1
-- exactly as before, and an enrolled but unverified factor does not count.
--
-- The documented "opted-in users" policy reads auth.mfa_factors inline
-- (https://supabase.com/docs/guides/auth/auth-mfa, Database), but
-- `authenticated` has no SELECT on auth.mfa_factors, so it would fail with
-- permission denied. The check is therefore private.mfa_satisfied(), a
-- SECURITY DEFINER helper owned by postgres (which bypasses RLS on
-- auth.mfa_factors). Unlike the documented form, a token without an `aal`
-- claim counts as aal1 (as the Auth docs define it) instead of failing every
-- check, so it only matters for users with a verified factor.
--
-- One `as restrictive` policy per table, for every command: it is ANDed with
-- the existing owner policies, never widens them. Shared catalog rows
-- (foods and activities with owner_id null) fall under it too, so an aal1
-- session of an MFA user sees nothing at all. The SECURITY INVOKER RPCs
-- (search_foods, recent_foods, daily_energy_totals) read these tables as the
-- caller and inherit the rule. private.record_profile_version only runs from
-- a profiles write, which the rule already blocks.
--
-- The Open Food Facts RPCs are SECURITY DEFINER and bypass RLS on their
-- private tables. They only touch the caller's own rows, but those rows are
-- still the user's: an aal1 session could probe which barcodes the user
-- scanned without a match, poison the miss cache or spend the user's OFF
-- quota. They are re-created below with the same check. consume_sign_in_attempt
-- is unchanged: it runs before sign-in and holds no user data.
--
-- Behaviour contract for an aal1 session of a user with a verified factor:
-- - SELECT returns no rows; UPDATE and DELETE affect no rows;
-- - INSERT (and an upsert's insert) fails with SQLSTATE 42501 (row-level
--   security violation);
-- - consume_off_request, off_barcode_recently_missed and
--   record_off_barcode_miss raise SQLSTATE 42501, as for no signed-in user.

-- The check ------------------------------------------------------------------

create or replace function private.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or not exists (
      select 1
      from auth.mfa_factors f
      where f.user_id = auth.uid()
        and f.status = 'verified'
    );
$$;

comment on function private.mfa_satisfied() is
  'True when the caller''s session meets the MFA rule: aal2, or no verified MFA factor.';

-- Policies call it as the querying role, so `authenticated` needs EXECUTE
-- (not USAGE on the private schema: a stored policy resolves the function by OID).
revoke all on function private.mfa_satisfied() from public, anon;
grant execute on function private.mfa_satisfied() to authenticated;

-- One restrictive policy per user-data table ---------------------------------
-- `(select ...)` evaluates the check once per statement, not once per row.

create policy "profiles: aal2 when MFA is enabled"
  on public.profiles as restrictive for all
  to authenticated
  using ((select private.mfa_satisfied()));

create policy "profile_versions: aal2 when MFA is enabled"
  on public.profile_versions as restrictive for all
  to authenticated
  using ((select private.mfa_satisfied()));

create policy "foods: aal2 when MFA is enabled"
  on public.foods as restrictive for all
  to authenticated
  using ((select private.mfa_satisfied()));

create policy "food_portions: aal2 when MFA is enabled"
  on public.food_portions as restrictive for all
  to authenticated
  using ((select private.mfa_satisfied()));

create policy "food_favorites: aal2 when MFA is enabled"
  on public.food_favorites as restrictive for all
  to authenticated
  using ((select private.mfa_satisfied()));

create policy "recipes: aal2 when MFA is enabled"
  on public.recipes as restrictive for all
  to authenticated
  using ((select private.mfa_satisfied()));

create policy "recipe_items: aal2 when MFA is enabled"
  on public.recipe_items as restrictive for all
  to authenticated
  using ((select private.mfa_satisfied()));

create policy "food_entries: aal2 when MFA is enabled"
  on public.food_entries as restrictive for all
  to authenticated
  using ((select private.mfa_satisfied()));

create policy "activities: aal2 when MFA is enabled"
  on public.activities as restrictive for all
  to authenticated
  using ((select private.mfa_satisfied()));

create policy "activity_entries: aal2 when MFA is enabled"
  on public.activity_entries as restrictive for all
  to authenticated
  using ((select private.mfa_satisfied()));

create policy "weight_entries: aal2 when MFA is enabled"
  on public.weight_entries as restrictive for all
  to authenticated
  using ((select private.mfa_satisfied()));

-- Open Food Facts RPCs: same bodies as migration off_request_throttle, plus the check.
-- `create or replace` keeps their grants.

create or replace function public.consume_off_request(request_kind text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  current_window timestamptz := pg_catalog.date_trunc('minute', pg_catalog.now());
  max_requests int;
begin
  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not private.mfa_satisfied() then
    raise exception 'second factor required' using errcode = '42501';
  end if;

  max_requests := case request_kind
    when 'product' then 7
    when 'search' then 5
  end;
  if max_requests is null then
    raise exception 'unknown request kind: %', request_kind using errcode = '22023';
  end if;

  -- Expired windows are never read again: keep the table at a few rows per user.
  delete from private.off_request_counters c
  where c.user_id = caller
    and c.window_start < current_window;

  -- Atomic take: concurrent calls serialize on the row. A full window is left
  -- untouched (the WHERE skips the update), so no row comes back.
  insert into private.off_request_counters as c (user_id, kind, window_start, request_count)
  values (caller, request_kind, current_window, 1)
  on conflict (user_id, kind, window_start) do update
    set request_count = c.request_count + 1
    where c.request_count < max_requests;

  return found;
end;
$$;

create or replace function public.off_barcode_recently_missed(lookup_barcode text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not private.mfa_satisfied() then
    raise exception 'second factor required' using errcode = '42501';
  end if;
  if lookup_barcode is null or lookup_barcode !~ '^[0-9]{8,14}$' then
    raise exception 'barcode must be 8 to 14 digits' using errcode = '22023';
  end if;

  return exists (
    select 1
    from private.off_barcode_misses m
    where m.user_id = caller
      and m.barcode = lookup_barcode
      and m.checked_at > pg_catalog.now() - interval '24 hours'
  );
end;
$$;

create or replace function public.record_off_barcode_miss(lookup_barcode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  -- Bounds the table even for a caller hitting the function directly.
  max_misses constant int := 500;
begin
  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not private.mfa_satisfied() then
    raise exception 'second factor required' using errcode = '42501';
  end if;
  if lookup_barcode is null or lookup_barcode !~ '^[0-9]{8,14}$' then
    raise exception 'barcode must be 8 to 14 digits' using errcode = '22023';
  end if;

  delete from private.off_barcode_misses m
  where m.user_id = caller
    and m.checked_at <= pg_catalog.now() - interval '24 hours';

  insert into private.off_barcode_misses as m (user_id, barcode, checked_at)
  values (caller, lookup_barcode, pg_catalog.now())
  on conflict (user_id, barcode) do update
    set checked_at = excluded.checked_at;

  -- Keep only the caller's newest max_misses rows.
  delete from private.off_barcode_misses m
  where m.user_id = caller
    and m.barcode in (
      select o.barcode
      from private.off_barcode_misses o
      where o.user_id = caller
      order by o.checked_at desc, o.barcode
      offset max_misses
    );
end;
$$;
