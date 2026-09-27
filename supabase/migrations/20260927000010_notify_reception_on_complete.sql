-- Reception hears when a visit it checked in is completed.
--
-- The patient comes back to the front desk after the doctor, often for a
-- printed prescription. The receptionist who checked them in gets an alert the
-- moment the doctor completes the visit, and it opens that patient's record.
--
-- Safe to run twice.

create or replace function public.notify_receptionist()
returns trigger language plpgsql security definer
set search_path = public as $fn$
begin
  if new.receptionist_id is null then
    return new;
  end if;

  insert into public.notifications (recipient_id, visit_id, type, title, body)
  select new.receptionist_id, new.id, 'visit_completed', 'Visit completed',
         p.full_name || ' - ' || new.visit_code
    from public.patients p
   where p.id = new.patient_id;
  return new;
end $fn$;

drop trigger if exists t_visits_notify_receptionist on public.visits;
create trigger t_visits_notify_receptionist
  after update of status on public.visits
  for each row
  when (new.status = 'completed' and old.status <> 'completed')
  execute function public.notify_receptionist();
