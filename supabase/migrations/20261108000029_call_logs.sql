-- The call center's log: one row per call an agent takes or makes.
--
--   agent_id   who logged it. Set by the insert policy to the caller, so an
--              agent cannot log a call under someone else's name.
--   call_type  inbound | outbound
--   reason     product_inquiry | order | complaint | follow_up | other
--   outcome    sold | callback_needed | resolved | no_answer | not_interested
--
-- An agent may add a call and read their own, and nothing else: no editing,
-- no deleting (the form asks them to check before saving). The owner reads
-- every call and may delete one logged by mistake.
--
-- staff.call_export_fields keeps the owner's last CSV choice — which columns,
-- in which order — so the export dialog opens the way it was left.
--
-- Run after 20261108000028 (the call_center role). Safe to run twice.

create table if not exists public.call_logs (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  agent_id        uuid not null default auth.uid() references public.staff(id),
  customer_name   text not null check (char_length(customer_name) between 1 and 120),
  phone           text not null check (char_length(phone) between 1 and 40),
  call_type       text not null check (call_type in ('inbound', 'outbound')),
  reason          text not null
                  check (reason in ('product_inquiry', 'order', 'complaint', 'follow_up', 'other')),
  product         text check (product is null or char_length(product) <= 200),
  outcome         text not null
                  check (outcome in ('sold', 'callback_needed', 'resolved', 'no_answer', 'not_interested')),
  duration_min    numeric(6,1) check (duration_min is null or duration_min between 0 and 1440),
  follow_up_date  date,
  recording_url   text check (
                    recording_url is null
                    or (recording_url ~* '^https?://' and char_length(recording_url) <= 500)
                  ),
  notes           text check (notes is null or char_length(notes) <= 2000)
);

create index if not exists call_logs_created_idx on public.call_logs (created_at desc);
create index if not exists call_logs_agent_idx on public.call_logs (agent_id, created_at desc);

alter table public.call_logs enable row level security;
revoke all on public.call_logs from anon;
revoke all on public.call_logs from authenticated;
grant select, insert, delete on public.call_logs to authenticated;

-- my_role() is compared as text: the enum value is new, and comparing it as
-- an enum here would tie this policy to the previous migration's transaction.
drop policy if exists call_logs_agent_insert on public.call_logs;
create policy call_logs_agent_insert on public.call_logs
  for insert to authenticated
  with check (public.my_role()::text = 'call_center' and agent_id = auth.uid());

-- An agent reads their own calls (the insert needs it to hand the row back);
-- the owner reads everyone's.
drop policy if exists call_logs_read on public.call_logs;
create policy call_logs_read on public.call_logs
  for select to authenticated
  using (public.is_owner() or (public.my_role()::text = 'call_center' and agent_id = auth.uid()));

drop policy if exists call_logs_owner_delete on public.call_logs;
create policy call_logs_owner_delete on public.call_logs
  for delete to authenticated
  using (public.is_owner());

-- ---------------------------------------------- the owner's CSV choice --
alter table public.staff
  add column if not exists call_export_fields text[];
