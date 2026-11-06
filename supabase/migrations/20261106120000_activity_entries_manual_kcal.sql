-- Lets a user log the calories a device reported (a watch, for example) instead
-- of the MET estimate. The flag tells a typed value from a computed one, so
-- editing an entry's duration recomputes only the computed ones. Existing rows
-- were all computed, which is what the default says.

alter table public.activity_entries
  add column kcal_is_manual boolean not null default false;

comment on column public.activity_entries.kcal_is_manual is
  'True when the user typed kcal; false when it is the MET estimate.';
