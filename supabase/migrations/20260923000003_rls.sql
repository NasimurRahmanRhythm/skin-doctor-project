-- Row Level Security. Every table is deny-by-default; nothing is readable
-- without a policy that names the caller's role.

alter table public.staff          enable row level security;
alter table public.patients       enable row level security;
alter table public.visits         enable row level security;
alter table public.visit_entries  enable row level security;
alter table public.notifications  enable row level security;
alter table public.visit_counters enable row level security;

-- No anonymous access anywhere. Staff sign in or they see nothing.
revoke all on public.staff, public.patients, public.visits,
              public.visit_entries, public.notifications, public.visit_counters
  from anon;

grant select, insert, update on public.patients      to authenticated;
grant select, insert, update on public.visits        to authenticated;
grant select, insert         on public.visit_entries to authenticated;
grant select, update         on public.notifications to authenticated;
grant select                 on public.staff         to authenticated;

-- ---------------------------------------------------------------- staff ----
-- Only the owner reads the full staff row (email, phone). Everyone else uses
-- the directory view below, which exposes names and roles and nothing else.
create policy staff_owner_all on public.staff
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

create policy staff_read_self on public.staff
  for select to authenticated
  using (id = auth.uid());

-- Deliberately not security_invoker: every signed-in staff member may read
-- this, because the check-in form needs the list of doctors.
create view public.staff_directory as
  select id, full_name, role, specialty, is_active
    from public.staff;

revoke all on public.staff_directory from anon;
grant select on public.staff_directory to authenticated;

-- ------------------------------------------------------------- patients ----
create policy patients_owner_all on public.patients
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- The receptionist needs lookup-by-phone to recognise a returning patient.
create policy patients_reception_read on public.patients
  for select to authenticated
  using (public.my_role() = 'receptionist');

create policy patients_reception_write on public.patients
  for insert to authenticated
  with check (public.my_role() = 'receptionist');

create policy patients_reception_update on public.patients
  for update to authenticated
  using (public.my_role() = 'receptionist')
  with check (public.my_role() = 'receptionist');

-- Clinical staff see a patient only through a visit that is theirs.
create policy patients_clinical_read on public.patients
  for select to authenticated
  using (
    public.my_role() in ('nurse','doctor')
    and exists (
      select 1 from public.visits v
       where v.patient_id = patients.id
         and (
           (public.my_role() = 'nurse'  and (v.nurse_id = auth.uid()
                                             or v.status = 'awaiting_vitals'))
        or (public.my_role() = 'doctor' and v.doctor_id = auth.uid())
         )
    )
  );

-- --------------------------------------------------------------- visits ----
create policy visits_owner_all on public.visits
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Reception may create a visit, and re-read only the ones it created.
create policy visits_reception_insert on public.visits
  for insert to authenticated
  with check (
    public.my_role() = 'receptionist'
    and receptionist_id = auth.uid()
  );

create policy visits_reception_read on public.visits
  for select to authenticated
  using (
    public.my_role() = 'receptionist'
    and receptionist_id = auth.uid()
  );

-- The nurse queue is "waiting for vitals", plus anything already taken.
create policy visits_nurse_read on public.visits
  for select to authenticated
  using (
    public.my_role() = 'nurse'
    and (status = 'awaiting_vitals' or nurse_id = auth.uid())
  );

create policy visits_nurse_update on public.visits
  for update to authenticated
  using (
    public.my_role() = 'nurse'
    and (status = 'awaiting_vitals' or nurse_id = auth.uid())
  )
  with check (public.my_role() = 'nurse');

-- A doctor sees only their own patients. Not the whole clinic.
create policy visits_doctor_read on public.visits
  for select to authenticated
  using (public.my_role() = 'doctor' and doctor_id = auth.uid());

create policy visits_doctor_update on public.visits
  for update to authenticated
  using (public.my_role() = 'doctor' and doctor_id = auth.uid())
  with check (public.my_role() = 'doctor' and doctor_id = auth.uid());

-- -------------------------------------------------------- visit_entries ----
-- Reception has no policy here at all: clinical notes are not theirs to read.
create policy entries_owner_all on public.visit_entries
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

create policy entries_clinical_read on public.visit_entries
  for select to authenticated
  using (
    exists (
      select 1 from public.visits v
       where v.id = visit_entries.visit_id
         and (
           (public.my_role() = 'nurse'  and (v.nurse_id = auth.uid()
                                             or v.status = 'awaiting_vitals'))
        or (public.my_role() = 'doctor' and v.doctor_id = auth.uid())
         )
    )
  );

create policy entries_clinical_insert on public.visit_entries
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.visits v
       where v.id = visit_entries.visit_id
         and (
           (public.my_role() = 'nurse'  and (v.nurse_id = auth.uid()
                                             or v.status = 'awaiting_vitals'))
        or (public.my_role() = 'doctor' and v.doctor_id = auth.uid())
         )
    )
  );

-- -------------------------------------------------------- notifications ----
-- Written by triggers running as definer, so no insert policy is needed.
create policy notifications_read_own on public.notifications
  for select to authenticated
  using (recipient_id = auth.uid());

create policy notifications_mark_read on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- visit_counters intentionally has no policy: only the definer trigger and
-- the service role ever touch it.
