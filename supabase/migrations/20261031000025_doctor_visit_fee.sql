-- A doctor's visit price, in taka. Optional.
--
-- The owner sets it when adding a doctor, or later from the staff list, and
-- the reception check-in form shows it beside each doctor's name. It goes on
-- staff_directory, the view every signed-in staff member can read, because
-- reception cannot read public.staff itself.
--
-- Until this runs, doctors are added and checked in as before, without a price.
--
-- Safe to run twice.

alter table public.staff
  add column if not exists visit_fee integer;

do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'staff_visit_fee_range') then
    alter table public.staff
      add constraint staff_visit_fee_range
        check (visit_fee is null or visit_fee between 0 and 1000000);
  end if;
end $c$;

-- Same view as before with visit_fee added at the end, so `create or replace`
-- can keep it (and its grants) in place.
create or replace view public.staff_directory as
  select id, full_name, role, specialty, is_active, visit_fee
    from public.staff;
