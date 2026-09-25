-- Reception intake, reworked.
--
-- The desk now records date of birth instead of age (an age typed today is
-- wrong a year from now), an optional email, and the patient's skin as the
-- clinic actually talks about it: skin type and presenting conditions, plus
-- free-text notes. Gender and "reason for visit" are no longer asked; the old
-- columns stay so earlier visits still read correctly.
--
-- Skin details live on the visit, not the patient: a returning patient's skin
-- changes, and each visit should keep what was true that day.
--
-- Safe to run twice.

alter table public.patients
  add column if not exists date_of_birth date,
  add column if not exists email         text;

alter table public.patients
  drop constraint if exists patients_date_of_birth_check;
alter table public.patients
  add constraint patients_date_of_birth_check
  -- No "not in the future" bound here: CHECK must not depend on current_date.
  -- The server action rejects future dates.
  check (date_of_birth is null or date_of_birth > date '1890-01-01');

alter table public.visits
  add column if not exists skin_types      text[] not null default '{}',
  add column if not exists skin_conditions text[] not null default '{}',
  add column if not exists intake_notes    text;

-- The server action validates these too; this holds if PostgREST is hit directly.
alter table public.visits
  drop constraint if exists visits_skin_types_check;
alter table public.visits
  add constraint visits_skin_types_check
  check (skin_types <@ array['normal','dry','oily','combination','sensitive']);

alter table public.visits
  drop constraint if exists visits_skin_conditions_check;
alter table public.visits
  add constraint visits_skin_conditions_check
  check (skin_conditions <@ array['acne','dry','hyperpigmentation','dehydrated',
                                  'allergies','rosacea','other']);
