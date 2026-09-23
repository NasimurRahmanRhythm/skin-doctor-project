-- Role helpers, doctor assignment, and the hand-off notification engine.

-- Reading the caller's role through a security-definer function keeps RLS
-- policies from recursing back into public.staff (which is itself RLS'd).
create or replace function public.my_role()
returns public.app_role language sql stable security definer
set search_path = public as $fn$
  select role from public.staff where id = auth.uid() and is_active;
$fn$;

create or replace function public.is_owner()
returns boolean language sql stable security definer
set search_path = public as $fn$
  select coalesce(
    (select role = 'owner' from public.staff where id = auth.uid() and is_active),
    false);
$fn$;

-- ------------------------------------------------- doctor assignment ----
-- "No preference" must not be pure random: that clumps the queue. Pick the
-- doctor with the fewest open visits today, breaking ties randomly.
create or replace function public.assign_doctor(p_preferred uuid)
returns uuid language sql volatile security definer
set search_path = public as $fn$
  select coalesce(
    (select id from public.staff
      where id = p_preferred and role = 'doctor' and is_active),
    (select s.id
       from public.staff s
       left join public.visits v
         on v.doctor_id = s.id
        and v.status <> 'completed'
        and (v.created_at at time zone 'Asia/Dhaka')::date = public.clinic_today()
      where s.role = 'doctor' and s.is_active
      group by s.id
      order by count(v.id) asc, random()
      limit 1)
  );
$fn$;

-- ------------------------------------------------------- hand-offs ----
-- Triggers run inside the inserting transaction, so the nurse's dashboard
-- lights up the instant the receptionist's save commits.
create or replace function public.notify_nurses()
returns trigger language plpgsql security definer
set search_path = public as $fn$
begin
  insert into public.notifications (recipient_id, visit_id, type, title, body)
  select s.id, new.id, 'new_patient', 'New patient checked in',
         p.full_name || ' - ' || new.visit_code
    from public.staff s
    cross join public.patients p
   where p.id = new.patient_id
     and s.role = 'nurse'
     and s.is_active;
  return new;
end $fn$;

create trigger t_visits_notify_nurses
  after insert on public.visits
  for each row execute function public.notify_nurses();

create or replace function public.notify_doctor()
returns trigger language plpgsql security definer
set search_path = public as $fn$
begin
  if new.doctor_id is null then
    return new;
  end if;

  insert into public.notifications (recipient_id, visit_id, type, title, body)
  select new.doctor_id, new.id, 'vitals_done', 'Patient ready for you',
         p.full_name || ' - ' || new.visit_code
    from public.patients p
   where p.id = new.patient_id;
  return new;
end $fn$;

create trigger t_visits_notify_doctor
  after update of status on public.visits
  for each row
  when (new.status = 'awaiting_doctor' and old.status = 'awaiting_vitals')
  execute function public.notify_doctor();

-- --------------------------------------------------- workflow stamps ----
-- Timestamps come from the database, not from whatever the client claims.
create or replace function public.stamp_visit_times()
returns trigger language plpgsql set search_path = public as $fn$
begin
  if new.status = 'awaiting_doctor' and old.status = 'awaiting_vitals' then
    new.vitals_at := now();
  end if;
  if new.status = 'completed' and old.status <> 'completed' then
    new.completed_at := now();
  end if;
  return new;
end $fn$;

create trigger t_visits_stamp_times
  before update of status on public.visits
  for each row execute function public.stamp_visit_times();

-- -------------------------------------------------- column-level guard ----
-- RLS controls which ROWS a role may touch; it cannot stop a nurse from
-- writing into `diagnosis`. Server actions validate their own fields, but
-- this is the backstop that holds even if a client talks to PostgREST directly.
create or replace function public.guard_visit_columns()
returns trigger language plpgsql security definer
set search_path = public as $fn$
declare
  r public.app_role := public.my_role();
begin
  -- r is null for the service role, which is trusted by definition.
  if r is null or r = 'owner' then
    return new;
  end if;

  if r = 'nurse' then
    if new.diagnosis      is distinct from old.diagnosis
    or new.prescription   is distinct from old.prescription
    or new.advice         is distinct from old.advice
    or new.follow_up_date is distinct from old.follow_up_date then
      raise exception 'A nurse cannot modify doctor fields on a visit';
    end if;

  elsif r = 'doctor' then
    if new.height_cm      is distinct from old.height_cm
    or new.weight_kg      is distinct from old.weight_kg
    or new.blood_pressure is distinct from old.blood_pressure
    or new.blood_sugar    is distinct from old.blood_sugar
    or new.temperature    is distinct from old.temperature
    or new.pulse          is distinct from old.pulse then
      raise exception 'A doctor cannot modify nurse vitals';
    end if;

  elsif r = 'receptionist' then
    raise exception 'A receptionist cannot modify a visit after check-in';
  end if;

  return new;
end $fn$;

create trigger t_visits_guard_columns
  before update on public.visits
  for each row execute function public.guard_visit_columns();
