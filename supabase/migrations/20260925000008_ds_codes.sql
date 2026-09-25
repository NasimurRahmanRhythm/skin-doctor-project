-- Record codes carry the clinic's new name: DS- (DermaSoul) instead of LL-.
--
--   patients: DS-P-00013        visits: DS-260925-004
--
-- Only codes created from now on change. Existing codes stay exactly as they
-- are: they are printed on slips and prescriptions patients already hold, and
-- staff read them back over the phone. Numbering carries on from the same
-- sequence and daily counter, so a new code never repeats an old number.
--
-- Safe to run twice.

alter table public.patients
  alter column patient_code
  set default 'DS-P-' || lpad(nextval('public.patient_code_seq')::text, 5, '0');

-- Visit codes read aloud over the phone, so: DS-260925-001, not a random hash.
create or replace function public.set_visit_code()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  d   date := public.clinic_today();
  seq int;
begin
  insert into public.visit_counters (day, n) values (d, 1)
  on conflict (day) do update set n = public.visit_counters.n + 1
  returning n into seq;

  new.visit_code := 'DS-' || to_char(d, 'YYMMDD') || '-' || lpad(seq::text, 3, '0');
  return new;
end $fn$;
