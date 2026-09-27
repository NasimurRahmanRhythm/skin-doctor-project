-- Reception reads every patient's history, the way the owner does.
--
-- Until now reception could re-read only the visits it checked in itself, and
-- only the files it attached. The front desk now answers "when was she last
-- here, who saw her, what was she given?" for any patient, so it gets the same
-- read access to visits and visit entries as the owner. Read only: it still
-- cannot change a visit after check-in, and it still writes only intake files
-- on visits it created.
--
-- Safe to run twice: every policy is dropped first.

-- ---------------------------------------------------------------- visits ----
drop policy if exists visits_reception_read on public.visits;
create policy visits_reception_read on public.visits
  for select to authenticated
  using (public.my_role() = 'receptionist');

-- --------------------------------------------------------- visit_entries ----
-- Replaces entries_reception_read_own, which reached only its own uploads.
drop policy if exists entries_reception_read_own on public.visit_entries;
drop policy if exists entries_reception_read on public.visit_entries;
create policy entries_reception_read on public.visit_entries
  for select to authenticated
  using (public.my_role() = 'receptionist');
