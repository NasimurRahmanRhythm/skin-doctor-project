-- A doctor reads the whole history of any patient they are seeing.
--
-- Until now a doctor saw only the visits assigned to them, so a patient who
-- saw Dr A last month and Dr B today arrived at Dr B with no earlier
-- prescription. Now a doctor may read every visit, and every entry on it, of
-- any patient who has at least one visit with them. Read only: writing is
-- still limited to the doctor's own visits (visits_doctor_update and
-- entries_clinical_insert are untouched).
--
-- Safe to run twice.

-- Security definer so the check can look across visits without the policy
-- on visits recursing into itself.
create or replace function public.doctor_has_patient(p_patient uuid)
returns boolean language sql stable security definer
set search_path = public as $fn$
  select exists (
    select 1 from public.visits
     where patient_id = p_patient
       and doctor_id = auth.uid()
  );
$fn$;

revoke all on function public.doctor_has_patient(uuid) from public, anon;
grant execute on function public.doctor_has_patient(uuid) to authenticated;

-- ---------------------------------------------------------------- visits ----
drop policy if exists visits_doctor_read on public.visits;
create policy visits_doctor_read on public.visits
  for select to authenticated
  using (
    public.my_role() = 'doctor'
    and (doctor_id = auth.uid() or public.doctor_has_patient(patient_id))
  );

-- --------------------------------------------------------- visit_entries ----
-- Added beside entries_clinical_read, which still covers the doctor's own
-- visits and the nurse's.
drop policy if exists entries_doctor_patient_read on public.visit_entries;
create policy entries_doctor_patient_read on public.visit_entries
  for select to authenticated
  using (
    public.my_role() = 'doctor'
    and exists (
      select 1 from public.visits v
       where v.id = visit_entries.visit_id
         and public.doctor_has_patient(v.patient_id)
    )
  );
