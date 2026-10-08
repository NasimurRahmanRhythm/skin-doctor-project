-- A phone number on "Book a Consultation" inquiries, and the clinic's
-- Instagram and YouTube profiles.
--
-- 1. inquiries.phone: optional for the visitor. The owner sees it with the
--    inquiry in the dashboard, with a link to call it. Until this runs, the
--    website still accepts inquiries: it adds the number to the message text.
--
-- 2. site_settings: saves the clinic's Instagram and YouTube profiles, as if
--    entered under Social media in the dashboard. Instagram replaces any
--    profile saved before; YouTube is added to the other saved links
--    (Facebook, X, LinkedIn are kept). Both can be changed later in the
--    dashboard. Needs 20261006000018 for visitors to read the "social" key.
--
-- Safe to run twice.

-- ------------------------------------------------------------ 1. phone --
alter table public.inquiries
  add column if not exists phone text;

do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'inquiries_phone_length') then
    alter table public.inquiries
      add constraint inquiries_phone_length
        check (phone is null or char_length(phone) between 6 and 30);
  end if;
end $c$;

-- ------------------------------------------- 2. Instagram and YouTube --
-- The handle is left empty so the website shows the one in the link:
-- @dermasoulmedical.
insert into public.site_settings (key, value, updated_at)
values ('instagram',
        '{"url": "https://www.instagram.com/dermasoulmedical/", "handle": null}'::jsonb,
        now())
on conflict (key) do update
  set value = excluded.value,
      updated_at = excluded.updated_at;

insert into public.site_settings (key, value, updated_at)
values ('social',
        '{"youtube": "https://www.youtube.com/@DermaSoulMedical"}'::jsonb,
        now())
on conflict (key) do update
  set value = public.site_settings.value || excluded.value,
      updated_at = excluded.updated_at;
