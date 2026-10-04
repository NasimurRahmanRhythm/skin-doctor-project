-- Staff: designations the owner defines, profile photos, and the doctors the
-- public website may show.
--
--   designations         the list a doctor's designation is picked from.
--                        staff.specialty keeps the chosen *name* as text, so
--                        removing a designation later never touches a doctor
--                        who already has it, and the prescription letterhead
--                        keeps reading the one column it always has.
--   staff.photo_path     object path in the public staff-photos bucket.
--   staff.show_on_website  whether a doctor appears on the landing page.
--   website_doctors      the only window the public site has onto staff:
--                        name, designation, photo. Never email or phone.
--
-- Safe to run twice.

-- ---------------------------------------------------------- designations --
create table if not exists public.designations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now()
);
create unique index if not exists designations_name_ci_idx
  on public.designations (lower(name));

alter table public.designations enable row level security;
revoke all on public.designations from anon;
grant select, insert, delete on public.designations to authenticated;

drop policy if exists designations_staff_read on public.designations;
create policy designations_staff_read on public.designations
  for select to authenticated
  using (true);

drop policy if exists designations_owner_write on public.designations;
create policy designations_owner_write on public.designations
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- --------------------------------------------------------- staff columns --
alter table public.staff
  add column if not exists photo_path text,
  add column if not exists show_on_website boolean not null default true;

-- ------------------------------------------------------------ photo bucket --
-- Public: these are staff headshots shown on the website, nothing clinical.
-- Public only means anyone can *read* an object by its URL; writes still go
-- through the policies below, and only the owner passes them.
insert into storage.buckets (id, name, public)
values ('staff-photos', 'staff-photos', true)
on conflict (id) do update set public = true;

drop policy if exists staff_photos_owner_read on storage.objects;
create policy staff_photos_owner_read on storage.objects
  for select to authenticated
  using (bucket_id = 'staff-photos' and public.is_owner());

drop policy if exists staff_photos_owner_insert on storage.objects;
create policy staff_photos_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'staff-photos' and public.is_owner());

drop policy if exists staff_photos_owner_delete on storage.objects;
create policy staff_photos_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'staff-photos' and public.is_owner());

-- -------------------------------------------------- the website's doctors --
-- Deliberately not security_invoker, like staff_directory: it reads staff as
-- the view's owner so that anonymous visitors can see these four columns and
-- nothing else.
create or replace view public.website_doctors as
  select id, full_name, specialty, photo_path, created_at
    from public.staff
   where role = 'doctor' and is_active and show_on_website;

revoke all on public.website_doctors from anon, authenticated;
grant select on public.website_doctors to anon, authenticated;
