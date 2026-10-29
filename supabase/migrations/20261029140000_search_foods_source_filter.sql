-- Source filter: search_foods gains source_filter (default null = every
-- source) so the food lists can show one category at a time: the caller's own
-- created foods ('custom'), the ARGENFOODS catalog or Open Food Facts imports.
-- Open Food Facts imports also carry the caller's owner_id, so "created by me"
-- filters on source, not on ownership. The old four-argument signature is
-- dropped (an overload with defaults would make calls ambiguous); calls that
-- pass up to four arguments resolve to the new one and search every source.
-- The typo-tolerance fallback checks for exact hits within the same source, so
-- a filtered search is not left empty by a hit in another source.

drop function public.search_foods(text, boolean, integer, integer);

-- Search own + shared foods by name: substring match, or fuzzy word match
-- when no food contains the text.
-- Empty query lists favorites, then own foods, then the shared catalog.
create function public.search_foods(
  search_query text default '',
  favorites_only boolean default false,
  result_limit integer default 30,
  result_offset integer default 0,
  source_filter text default null
)
returns table (
  id bigint,
  name text,
  brand text,
  source text,
  food_group text,
  barcode text,
  kcal_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  is_own boolean,
  is_favorite boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select
      q,
      -- LIKE pattern with the user's wildcards escaped.
      replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') as q_like,
      least(greatest(coalesce(result_limit, 30), 1), 50) as lim,
      greatest(coalesce(result_offset, 0), 0) as skip
    from (
      select lower(extensions.unaccent(
        'extensions.unaccent'::regdictionary,
        left(btrim(coalesce(search_query, '')), 100)
      )) as q
    ) normalized
  )
  select
    f.id,
    f.name,
    f.brand,
    f.source,
    f.food_group,
    f.barcode,
    f.kcal_per_100g,
    f.protein_per_100g,
    f.carbs_per_100g,
    f.fat_per_100g,
    coalesce(f.owner_id = (select auth.uid()), false) as is_own,
    fav.food_id is not null as is_favorite
  from public.foods f
  cross join params p
  left join public.food_favorites fav
    on fav.food_id = f.id
   and fav.user_id = (select auth.uid())
  where (not favorites_only or fav.food_id is not null)
    and (source_filter is null or f.source = source_filter)
    and (
      p.q = ''
      or f.search_name like '%' || p.q_like || '%'
      -- Typo tolerance (strict word similarity >= 0.5, "aroz" -> "arroz")
      -- only when nothing contains the text, so an exact hit such as
      -- "granola" is not buried under "grano ..." rows.
      or (
        p.q operator(extensions.<<%) f.search_name
        and not exists (
          select 1 from public.foods hit
          where hit.search_name like '%' || p.q_like || '%'
            and (source_filter is null or hit.source = source_filter)
        )
      )
    )
  -- f.id last keeps the order total, so consecutive pages never overlap.
  order by
    (p.q <> '' and f.search_name like p.q_like || '%') desc,
    case when p.q = '' then 0 else extensions.strict_word_similarity(p.q, f.search_name) end desc,
    (fav.food_id is not null) desc,
    (f.owner_id is not null) desc,
    f.name,
    f.id
  limit (select lim from params)
  offset (select skip from params);
$$;

comment on function public.search_foods(text, boolean, integer, integer, text) is
  'Name search over foods visible to the caller, optionally of one source, one page at a time (RLS applies: SECURITY INVOKER).';

revoke all on function public.search_foods(text, boolean, integer, integer, text) from public, anon;
grant execute on function public.search_foods(text, boolean, integer, integer, text) to authenticated;
