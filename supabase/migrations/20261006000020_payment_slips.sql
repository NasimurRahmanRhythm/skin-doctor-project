-- Payment slips: the bill reception fills in and prints for a patient.
--
--   payment_slips          one row per printed slip. What was typed on the
--                          sheet is kept as typed (name, age, receipt no are
--                          free text, not links to patients), because a slip
--                          can be for someone who was never checked in.
--   items                  the table on the slip, as a JSON array of
--                          { description, cost, qty, total } in taka.
--   receptionist_id        who handled the payment. Set by the insert policy
--                          to the caller, so it cannot name someone else.
--   payment_slip_totals()  slips and money per receptionist over a date
--                          range, for the owner's payments page.
--
-- A slip is a financial record: reception may add one and read its own, and
-- nobody is granted update or delete.
--
-- Safe to run twice.

create table if not exists public.payment_slips (
  id              uuid primary key default gen_random_uuid(),
  receipt_no      text,
  slip_date       date not null,
  patient_name    text,
  patient_age     text,
  patient_gender  text,
  patient_address text,
  patient_phone   text,
  items           jsonb not null default '[]'::jsonb
                  check (jsonb_typeof(items) = 'array'),
  total           numeric(12,2) not null check (total >= 0),
  receptionist_id uuid not null references public.staff(id),
  created_at      timestamptz not null default now()
);

create index if not exists payment_slips_date_idx
  on public.payment_slips (slip_date desc, created_at desc);
create index if not exists payment_slips_receptionist_idx
  on public.payment_slips (receptionist_id, slip_date desc);

alter table public.payment_slips enable row level security;
revoke all on public.payment_slips from anon;
revoke all on public.payment_slips from authenticated;
grant select, insert on public.payment_slips to authenticated;

drop policy if exists payment_slips_owner_all on public.payment_slips;
create policy payment_slips_owner_all on public.payment_slips
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists payment_slips_reception_insert on public.payment_slips;
create policy payment_slips_reception_insert on public.payment_slips
  for insert to authenticated
  with check (
    public.my_role() = 'receptionist'
    and receptionist_id = auth.uid()
  );

-- Needed for the insert to hand its own row back, and so a desk can look up
-- what it took. Another receptionist's slips are not theirs to read.
drop policy if exists payment_slips_reception_read on public.payment_slips;
create policy payment_slips_reception_read on public.payment_slips
  for select to authenticated
  using (
    public.my_role() = 'receptionist'
    and receptionist_id = auth.uid()
  );

-- Runs as the caller, so RLS still applies: the owner gets every desk, a
-- receptionist would only ever get their own line.
create or replace function public.payment_slip_totals(
  p_from date default null,
  p_to   date default null
)
returns table (receptionist_id uuid, slips bigint, total numeric)
language sql stable security invoker
set search_path = public as $fn$
  select s.receptionist_id, count(*), coalesce(sum(s.total), 0)
    from public.payment_slips s
   where (p_from is null or s.slip_date >= p_from)
     and (p_to   is null or s.slip_date <= p_to)
   group by s.receptionist_id;
$fn$;

revoke all on function public.payment_slip_totals(date, date) from public, anon;
grant execute on function public.payment_slip_totals(date, date) to authenticated;
