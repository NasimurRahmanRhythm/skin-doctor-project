-- Private attachment bucket, and the realtime feed the dashboards subscribe to.

insert into storage.buckets (id, name, public)
values ('patient-files', 'patient-files', false)
on conflict (id) do nothing;

-- Private bucket: files are only ever served through short-lived signed URLs
-- generated server-side, never by a public object URL.
create policy patient_files_clinical_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'patient-files'
    and public.my_role() in ('owner','nurse','doctor')
  );

create policy patient_files_clinical_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'patient-files'
    and public.my_role() in ('owner','nurse','doctor')
  );

create policy patient_files_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'patient-files'
    and public.is_owner()
  );

-- Realtime. Each dashboard subscribes with a
-- `recipient_id=eq.<their id>` filter, and RLS is re-checked per subscriber,
-- so a doctor cannot listen in on a nurse's queue.
alter publication supabase_realtime add table public.notifications;
