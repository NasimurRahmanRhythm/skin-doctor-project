-- The patient's ID (e.g. DS-P-00001) on a payment slip. Optional.
--
-- Until this runs, slips still save; they just leave the ID out.
--
-- Safe to run twice.

alter table public.payment_slips
  add column if not exists patient_code text;

do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'payment_slips_patient_code_length') then
    alter table public.payment_slips
      add constraint payment_slips_patient_code_length
        check (patient_code is null or char_length(patient_code) <= 40);
  end if;
end $c$;
