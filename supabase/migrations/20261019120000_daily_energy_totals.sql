-- Progress support: per-day energy totals for a date range.
--
-- The Progress screen shows a daily calorie balance history (food minus
-- exercise against the target) over up to 90 days. Summing raw rows in the
-- app would page through every food and activity entry of the range and hit
-- the Data API max_rows cap (1000) on busy ranges, silently dropping rows.
-- This function returns at most one row per day instead (only days with at
-- least one food or activity entry), summed in the database.
--
-- SECURITY INVOKER: RLS on food_entries and activity_entries still decides
-- what the caller can read; the explicit user_id filter matches the
-- (user_id, entry_date) indexes on both tables.
--
-- Error contract: SQLSTATE 22023 (invalid_parameter_value) for a missing or
-- reversed range, or one longer than 366 days.

create or replace function public.daily_energy_totals(start_date date, end_date date)
returns table (
  entry_date date,
  food_kcal numeric,
  exercise_kcal numeric
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  if start_date is null or end_date is null or start_date > end_date then
    raise exception 'start_date must be on or before end_date' using errcode = '22023';
  end if;
  if end_date - start_date > 366 then
    raise exception 'the range can span at most 366 days' using errcode = '22023';
  end if;

  return query
  with food as (
    select f.entry_date as day, sum(f.kcal) as kcal
    from public.food_entries f
    where f.user_id = (select auth.uid())
      and f.entry_date between start_date and end_date
    group by f.entry_date
  ),
  exercise as (
    select a.entry_date as day, sum(a.kcal) as kcal
    from public.activity_entries a
    where a.user_id = (select auth.uid())
      and a.entry_date between start_date and end_date
    group by a.entry_date
  )
  select
    coalesce(food.day, exercise.day),
    coalesce(food.kcal, 0)::numeric,
    coalesce(exercise.kcal, 0)::numeric
  from food
  full join exercise on exercise.day = food.day
  order by 1;
end;
$$;

comment on function public.daily_energy_totals(date, date) is
  'The caller''s food and exercise kcal per day between start_date and end_date (inclusive; RLS applies: SECURITY INVOKER).';

revoke all on function public.daily_energy_totals(date, date) from public, anon;
grant execute on function public.daily_energy_totals(date, date) to authenticated;
