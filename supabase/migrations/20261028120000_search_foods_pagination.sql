-- Paged food search: search_foods gains result_offset (default 0) so the
-- Foods screen can page through results. The old three-argument signature is
-- dropped (an overload with defaults would make calls ambiguous); calls that
-- pass three arguments resolve to the new one and start at the first row.
-- The ranking needs every match sorted anyway (similarity order), so OFFSET
-- adds little over the current query; keyset paging would need the computed
-- sort keys as a cursor.

drop function public.search_foods(text, boolean, integer);

-- Search own + shared foods by name: substring match, or fuzzy word match
-- when no food contains the text.
-- Empty query lists favorites, then own foods, then the shared catalog.
create function public.search_foods(
  search_query text default '',
  favorites_only boolean default false,
  result_limit integer default 30,
  result_offset integer default 0
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

comment on function public.search_foods(text, boolean, integer, integer) is
  'Name search over foods visible to the caller, one page at a time (RLS applies: SECURITY INVOKER).';

revoke all on function public.search_foods(text, boolean, integer, integer) from public, anon;
grant execute on function public.search_foods(text, boolean, integer, integer) to authenticated;
