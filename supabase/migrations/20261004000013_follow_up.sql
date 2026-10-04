-- Follow Up: free text under the Rx on the prescription pad.
--
-- "Come back after 2 weeks, bring the previous reports." One block per visit,
-- not a list, so it is a plain text column. NULL until the doctor writes one.
-- The old follow_up_date column stays for visits written before the pad.
--
-- Safe to run twice.

alter table public.visits
  add column if not exists follow_up text;

alter table public.visits
  drop constraint if exists visits_follow_up_length_check;
alter table public.visits
  add constraint visits_follow_up_length_check
  check (follow_up is null or char_length(follow_up) <= 1000);
