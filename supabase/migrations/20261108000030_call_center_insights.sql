-- The call center, joined up: who a caller is, which callbacks are still
-- owed, and how the desk is doing.
--
--   phone_key(text)        the last ten digits of a number, so 01711-222333,
--                          +8801711222333 and 01711 222 333 are one caller.
--   call_lookup(phone)     for the agent typing a number: how often this
--                          number has called before (any agent), the last
--                          call, an open follow-up, and whether it belongs to
--                          a clinic patient (code, name, visits).
--   call_follow_ups(agent) follow-ups still owed. A follow-up is done once a
--                          newer call to the same number is logged — so an
--                          agent closes one by logging the callback, and no
--                          saved call is ever edited.
--   call_center_report()   the owner's numbers for a date range: calls per
--                          day, by outcome, by reason, by hour, and per agent.
--
-- Run after 20261108000029 (call_logs). Safe to run twice.

create or replace function public.phone_key(p text)
returns text language sql immutable as $fn$
  select right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10);
$fn$;

create index if not exists call_logs_phone_key_idx
  on public.call_logs (public.phone_key(phone), created_at desc);
create index if not exists patients_phone_key_idx
  on public.patients (public.phone_key(phone));

-- ----------------------------------------------------------- lookup ----
-- Security definer: an agent may read only their own calls and no patients,
-- but needs to know this caller's history. What comes back is a summary, and
-- only to the call center and the owner.
create or replace function public.call_lookup(p_phone text)
returns jsonb language plpgsql stable security definer
set search_path = public as $fn$
declare
  k text := public.phone_key(p_phone);
  result jsonb;
begin
  if coalesce(public.my_role()::text, '') not in ('call_center', 'owner') then
    return null;
  end if;
  if length(k) < 6 then
    return null;
  end if;

  select jsonb_build_object(
    'calls', (select count(*) from call_logs c where public.phone_key(c.phone) = k),
    'last', (
      select jsonb_build_object(
        'created_at', c.created_at,
        'customer_name', c.customer_name,
        'outcome', c.outcome,
        'reason', c.reason,
        'agent', s.full_name,
        'notes', c.notes,
        'follow_up_date', c.follow_up_date
      )
        from call_logs c
        left join staff s on s.id = c.agent_id
       where public.phone_key(c.phone) = k
       order by c.created_at desc
       limit 1
    ),
    'patients', coalesce((
      select jsonb_agg(p order by p->>'last_visit' desc nulls last)
        from (
          select jsonb_build_object(
            'patient_code', pt.patient_code,
            'full_name', pt.full_name,
            'visits', (select count(*) from visits v where v.patient_id = pt.id),
            'last_visit', (select max(v.created_at) from visits v where v.patient_id = pt.id)
          ) as p
            from patients pt
           where public.phone_key(pt.phone) = k
           limit 5
        ) found
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$fn$;

revoke all on function public.call_lookup(text) from public, anon;
grant execute on function public.call_lookup(text) to authenticated;

-- ------------------------------------------------------- follow-ups ----
-- Security definer so "a newer call to the same number" counts whoever logged
-- it. An agent gets their own follow-ups; the owner everyone's.
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

-- ------------------------------------------------------------ report ----
-- Runs as the caller, so RLS decides what is counted: the owner gets every
-- call. Days and hours are the clinic's (Asia/Dhaka).
create or replace function public.call_center_report(p_from date, p_to date)
returns jsonb language sql stable security invoker
set search_path = public as $fn$
  with c as (
    select l.*, (l.created_at at time zone 'Asia/Dhaka') as local_at
      from call_logs l
     where (l.created_at at time zone 'Asia/Dhaka')::date between p_from and p_to
  ),
  open_fu as (
    select f.agent_id, f.follow_up_date from public.call_follow_ups() f
  )
  select jsonb_build_object(
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('day', d::date, 'calls', coalesce(n.calls, 0)) order by d)
        from generate_series(p_from, p_to, interval '1 day') d
        left join (select local_at::date as day, count(*) as calls from c group by 1) n
          on n.day = d::date
    ), '[]'::jsonb),
    'outcomes', coalesce((
      select jsonb_object_agg(outcome, calls) from (select outcome, count(*) calls from c group by 1) x
    ), '{}'::jsonb),
    'reasons', coalesce((
      select jsonb_object_agg(reason, calls) from (select reason, count(*) calls from c group by 1) x
    ), '{}'::jsonb),
    'hours', coalesce((
      select jsonb_object_agg(h, calls)
        from (select extract(hour from local_at)::int h, count(*) calls from c group by 1) x
    ), '{}'::jsonb),
    'agents', coalesce((
      select jsonb_agg(jsonb_build_object(
               'agent_id', a.agent_id,
               'calls', a.calls,
               'sold', a.sold,
               'avg_duration', a.avg_duration,
               'open_follow_ups', (select count(*) from open_fu o where o.agent_id = a.agent_id),
               'overdue', (select count(*) from open_fu o
                            where o.agent_id = a.agent_id
                              and o.follow_up_date < (now() at time zone 'Asia/Dhaka')::date)
             ) order by a.calls desc)
        from (
          select agent_id, count(*) calls,
                 count(*) filter (where outcome = 'sold') sold,
                 round(avg(duration_min), 1) avg_duration
            from c group by agent_id
        ) a
    ), '[]'::jsonb)
  );
$fn$;

revoke all on function public.call_center_report(date, date) from public, anon;
grant execute on function public.call_center_report(date, date) to authenticated;
