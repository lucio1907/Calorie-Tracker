-- Typed calories on activity entries (migration activity_entries_manual_kcal).
-- Rows that do not say otherwise stay computed estimates.
-- Run: npx supabase test db
-- Everything runs in one transaction and is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(3);

select col_type_is('public', 'activity_entries', 'kcal_is_manual', 'boolean', 'kcal_is_manual is a boolean');
select col_not_null('public', 'activity_entries', 'kcal_is_manual', 'kcal_is_manual is required');
select col_default_is('public', 'activity_entries', 'kcal_is_manual', 'false', 'entries default to a computed estimate');

select * from finish();
rollback;
