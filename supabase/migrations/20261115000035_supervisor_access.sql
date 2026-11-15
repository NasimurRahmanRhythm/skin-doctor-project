-- What a supervisor may read: every call, the follow-ups owed, and the
-- website's own events. Nothing else, and no writes. my_role() is compared
-- as text, as in the call center migrations. Safe to run twice.

-- Calls (also what call_center_report counts, as it runs as the caller).
drop policy if exists call_logs_read on public.call_logs;
create policy call_logs_read on public.call_logs
  for select to authenticated
  using (
    public.is_owner()
    or public.my_role()::text = 'supervisor'
    or (public.my_role()::text = 'call_center' and agent_id = auth.uid())
  );

-- Follow-ups owed: the owner and the supervisor see everyone's.
create or replace function public.call_follow_ups()
returns table (
  id uuid,
  created_at timestamptz,
  agent_id uuid,
  customer_name text,
  phone text,
  reason text,
  outcome text,
  follow_up_date date,
  notes text
)
language sql stable security definer
set search_path = public as $fn$
  select c.id, c.created_at, c.agent_id, c.customer_name, c.phone, c.reason,
         c.outcome, c.follow_up_date, c.notes
    from call_logs c
   where c.follow_up_date is not null
     and (
       public.is_owner()
       or public.my_role()::text = 'supervisor'
       or (public.my_role()::text = 'call_center' and c.agent_id = auth.uid())
     )
     and not exists (
       select 1 from call_logs later
        where public.phone_key(later.phone) = public.phone_key(c.phone)
          and later.created_at > c.created_at
     )
   order by c.follow_up_date, c.created_at
   limit 500;
$fn$;

revoke all on function public.call_follow_ups() from public, anon;
grant execute on function public.call_follow_ups() to authenticated;

-- Website stats (site_report runs as the caller, so this is what it counts).
drop policy if exists site_events_owner_read on public.site_events;
create policy site_events_owner_read on public.site_events
  for select to authenticated
  using (public.is_owner() or public.my_role()::text = 'supervisor');
