-- Reception can attach what the patient brings to the desk.
--
-- A patient arrives holding an old prescription, a lab report or a photo of
-- the rash from last week. Until now only the nurse and the doctor could put a
-- file on the record, so those pages were either re-typed or lost. Reception
-- may now attach them at check-in -- and nothing more: the entries it can read
-- back are only the ones it wrote itself, so clinical notes stay out of view.
--
-- Safe to run twice: every policy is dropped first.

-- A new entry type, kept distinct from 'report' so the doctor can tell at a
-- glance that this came in with the patient rather than from the clinic.
alter table public.visit_entries
  drop constraint if exists visit_entries_type_check;

alter table public.visit_entries
  add constraint visit_entries_type_check
  check (type in ('prescription','report','note','file','intake'));

-- ---------------------------------------------------------- visit_entries ----
drop policy if exists entries_reception_insert on public.visit_entries;
create policy entries_reception_insert on public.visit_entries
  for insert to authenticated
  with check (
    public.my_role() = 'receptionist'
    and author_id = auth.uid()
    and type = 'intake'
    and exists (
      select 1 from public.visits v
       where v.id = visit_entries.visit_id
         and v.receptionist_id = auth.uid()
    )
  );

-- Read back only its own uploads. This is what lets the desk confirm the scan
-- landed; it deliberately does not reach the nurse's or the doctor's entries.
drop policy if exists entries_reception_read_own on public.visit_entries;
create policy entries_reception_read_own on public.visit_entries
  for select to authenticated
  using (
    public.my_role() = 'receptionist'
    and author_id = auth.uid()
  );

-- --------------------------------------------------------- storage.objects ----
-- Uploads are keyed visits/<visit_id>/<file>, so the folder name is the proof
-- of ownership: reception may only write under a visit it checked in itself.
drop policy if exists patient_files_reception_insert on storage.objects;
create policy patient_files_reception_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'patient-files'
    and public.my_role() = 'receptionist'
    and exists (
      select 1 from public.visits v
       where v.receptionist_id = auth.uid()
         and v.id::text = (storage.foldername(name))[2]
    )
  );

-- --------------------------------------------------------- upload ceiling ----
-- 10 MB, enforced by storage itself. The forms and the server actions both
-- check this too, but those are app code: a request that skips the form would
-- skip them with it. This is the one check nothing can talk its way past, and
-- it is what actually protects the 1 GB the free tier gives us.
--
-- Mime types are left unrestricted on purpose. Reception is limited to PDFs
-- and images in the form, but the doctor desk has an "Other file" option, and
-- a bucket-level allow-list would reject those with an error that reads like
-- a bug rather than a rule.
update storage.buckets
   set file_size_limit = 10485760
 where id = 'patient-files';
