-- The call center hands off to the clinic.
--
--   notifications.link        where an alert opens, for alerts that are not
--                             about a visit (the bell falls back to the visit
--                             as before).
--   complaint alert           a call logged with reason "complaint" alerts
--                             every active owner straight away.
--   refer_call_to_reception() "Send to reception": the agent who logged a
--                             call (or the owner) tells reception this caller
--                             is coming in. Every active receptionist gets an
--                             alert that opens the check-in form filled with
--                             the caller's name and number. The call records
--                             when, and by whom; its own details never change.
--   call_prefill()            the name and number behind such an alert, for
--                             reception, who cannot read the call log itself.
--
-- Run after 20261108000030. Safe to run twice.

alter table public.notifications
  add column if not exists link text;

alter table public.call_logs
  add column if not exists referred_at timestamptz,
  add column if not exists referred_by uuid references public.staff(id);

-- ------------------------------------------------------ complaint alert ----
create or replace function public.notify_owner_on_complaint()
returns trigger language plpgsql security definer
set search_path = public as $fn$
begin
  insert into public.notifications (recipient_id, type, title, body, link)
  select s.id, 'call_complaint', 'New complaint call',
         new.customer_name || ' · ' || new.phone || coalesce(' · ' || a.full_name, ''),
         -- The number as typed (digits and dashes only, which are safe in a
         -- URL), so the owner's search finds this call.
         '/admin/owner/call-center?q=' || regexp_replace(new.phone, '[^0-9-]', '', 'g')
    from public.staff s
    left join public.staff a on a.id = new.agent_id
   where s.role = 'owner' and s.is_active;
  return new;
end $fn$;

drop trigger if exists t_call_logs_notify_complaint on public.call_logs;
create trigger t_call_logs_notify_complaint
  after insert on public.call_logs
  for each row
  when (new.reason = 'complaint')
  execute function public.notify_owner_on_complaint();

-- --------------------------------------------------- send to reception ----
create or replace function public.refer_call_to_reception(p_call uuid)
returns timestamptz language plpgsql security definer
set search_path = public as $fn$
declare
  c public.call_logs;
  sender text;
begin
  select * into c from public.call_logs where id = p_call;
  if c.id is null then
    raise exception 'That call no longer exists.';
  end if;
  if not (
    public.is_owner()
    or (public.my_role()::text = 'call_center' and c.agent_id = auth.uid())
  ) then
    raise exception 'Only the agent who logged this call, or the owner, can send it.';
  end if;
  if c.referred_at is not null then
    return c.referred_at;
  end if;

  select full_name into sender from public.staff where id = auth.uid();

  insert into public.notifications (recipient_id, type, title, body, link)
  select s.id, 'call_referral', 'Caller coming in',
         c.customer_name || ' · ' || c.phone || coalesce(' · from ' || sender, ''),
         '/admin/reception?call=' || c.id
    from public.staff s
   where s.role = 'receptionist' and s.is_active;

  update public.call_logs
     set referred_at = now(), referred_by = auth.uid()
   where id = p_call;
  return now();
end $fn$;

revoke all on function public.refer_call_to_reception(uuid) from public, anon;
grant execute on function public.refer_call_to_reception(uuid) to authenticated;

create or replace function public.call_prefill(p_call uuid)
returns table (customer_name text, phone text)
language sql stable security definer
set search_path = public as $fn$
  select c.customer_name, c.phone
    from public.call_logs c
   where c.id = p_call
     and c.referred_at is not null
     and coalesce(public.my_role()::text, '') in ('receptionist', 'owner');
$fn$;

revoke all on function public.call_prefill(uuid) from public, anon;
grant execute on function public.call_prefill(uuid) to authenticated;
