-- A short tag under a doctor's name on the website, above the designation,
-- e.g. "Founder" or "Laser specialist". Optional.
--
-- Until this runs, the website shows the name and designation as before.
--
-- Run it after 20261101000026 (the doctor order), whose view this extends.
--
-- Safe to run twice.

alter table public.staff
  add column if not exists tag text;

do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'staff_tag_length') then
    alter table public.staff
      add constraint staff_tag_length check (tag is null or char_length(tag) <= 80);
  end if;
end $c$;

-- Same view as before with tag added at the end, so `create or replace` can
-- keep it (and its grants) in place.
create or replace view public.website_doctors as
  select id, full_name, specialty, photo_path, created_at, website_order as sort_order, tag
    from public.staff
   where role = 'doctor' and is_active and show_on_website;
