-- Open Food Facts request throttle and barcode miss cache.
--
-- Every OFF request leaves through the deployment's server (Vercel), so all
-- users share the same egress IPs and therefore one OFF quota. OFF limits
-- reads per IP and may ban an IP that keeps exceeding them:
--   15 req/min for product reads (GET /api/v*/product),
--   10 req/min for search queries,
--   https://openfoodfacts.github.io/openfoodfacts-server/api/ ("Rate limits").
-- Without a per-user limit one signed-in account could spend all of it (or get
-- the deployment banned). Vercel instances share no memory, so the counters
-- live here.
--
-- Per-user limits (fixed one-minute windows), at most half of OFF's per-IP
-- budget so a single user alone can never reach it and others keep headroom:
--   product: 7 requests per minute (OFF: 15)
--   search:  5 requests per minute (OFF: 10)
-- A person scanning or searching by hand stays well under both.
--
-- Barcodes OFF does not know are remembered per user for 24 hours, so
-- re-scanning an unknown product does not spend another request. The cache is
-- per user on purpose: a shared one would let one account mark any barcode as
-- missing for everyone. Only "not found" answers are cached; network errors
-- and 5xx are not (the app never records them).
--
-- Access model: both tables live in `private` (no Data API access) with RLS
-- enabled and no policies, as defense in depth. Users must not be able to
-- reset their own counters, so the only way in is the SECURITY DEFINER
-- functions below. They take no user id: the caller is always auth.uid().
--
-- Error contract (read by the app):
-- - SQLSTATE 42501 (insufficient_privilege) when there is no signed-in user;
-- - SQLSTATE 22023 (invalid_parameter_value) for an unknown request kind or a
--   barcode that is not 8 to 14 digits.

create table private.off_request_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('search', 'product')),
  window_start timestamptz not null,
  request_count int not null check (request_count > 0),
  primary key (user_id, kind, window_start)
);

comment on table private.off_request_counters is
  'Open Food Facts requests per user, kind and one-minute window. Written only by public.consume_off_request.';

create table private.off_barcode_misses (
  user_id uuid not null references auth.users (id) on delete cascade,
  barcode text not null check (barcode ~ '^[0-9]{8,14}$'),
  checked_at timestamptz not null default now(),
  primary key (user_id, barcode)
);

comment on table private.off_barcode_misses is
  'Barcodes Open Food Facts did not know, per user. Written only by public.record_off_barcode_miss.';

alter table private.off_request_counters enable row level security;
alter table private.off_barcode_misses enable row level security;

revoke all on table private.off_request_counters from public, anon, authenticated;
revoke all on table private.off_barcode_misses from public, anon, authenticated;

-- Takes one OFF request slot for the caller --------------------------------

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

comment on function public.consume_off_request(text) is
  'Takes one Open Food Facts request slot (''product'' or ''search'') for the caller in the current minute; false when the limit is reached.';

revoke all on function public.consume_off_request(text) from public, anon;
grant execute on function public.consume_off_request(text) to authenticated;

-- Barcode miss cache ---------------------------------------------------------

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

comment on function public.off_barcode_recently_missed(text) is
  'True when Open Food Facts did not know this barcode for the caller in the last 24 hours.';

revoke all on function public.off_barcode_recently_missed(text) from public, anon;
grant execute on function public.off_barcode_recently_missed(text) to authenticated;

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

comment on function public.record_off_barcode_miss(text) is
  'Remembers for 24 hours that Open Food Facts did not know this barcode (caller only; keeps the newest 500).';

revoke all on function public.record_off_barcode_miss(text) from public, anon;
grant execute on function public.record_off_barcode_miss(text) to authenticated;
