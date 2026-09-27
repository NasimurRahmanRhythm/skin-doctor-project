-- New skin options at the reception desk.
--
--   skin type:       + acne_prone
--   skin condition:  + hypopigmentation, + acne_scar, - dry
--
-- 'dry' stays allowed as a condition: visits already recorded with it must
-- keep passing the check. The form simply no longer offers it — dryness is a
-- skin type, and was on both lists.
--
-- Safe to run twice.

alter table public.visits
  drop constraint if exists visits_skin_types_check;
alter table public.visits
  add constraint visits_skin_types_check
  check (skin_types <@ array['normal','dry','oily','combination','sensitive',
                             'acne_prone']);

alter table public.visits
  drop constraint if exists visits_skin_conditions_check;
alter table public.visits
  add constraint visits_skin_conditions_check
  check (skin_conditions <@ array['acne','acne_scar','dry','hyperpigmentation',
                                  'hypopigmentation','dehydrated','allergies',
                                  'rosacea','other']);
