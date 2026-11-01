-- The order doctors appear in on the website. The owner moves them up and
-- down on the staff page: the top four are the landing page's Our Team, and
-- /team lists everyone in the same order.
--
-- Doctors who were never moved (website_order is null) come after the ones
-- who were, oldest first, as before. The existing doctors are numbered in
-- that order now, so nothing on the website moves until the owner moves it.
--
-- Until this runs, the website keeps showing doctors oldest first.
--
-- Safe to run twice.

alter table public.staff
  add column if not exists website_order integer;

with numbered as (
  select id, row_number() over (order by created_at) as n
    from public.staff
   where role = 'doctor' and website_order is null
)
update public.staff s
   set website_order = n.n + coalesce((select max(website_order) from public.staff), 0)
  from numbered n
 where s.id = n.id;

-- Same view as before with the order added at the end, so `create or replace`
-- can keep it (and its grants) in place. It is called sort_order there, like
-- every other ordered list the website reads.
create or replace view public.website_doctors as
  select id, full_name, specialty, photo_path, created_at, website_order as sort_order
    from public.staff
   where role = 'doctor' and is_active and show_on_website;
