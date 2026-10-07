-- "As seen in" and "Certifications & Societies": every field optional.
--
-- site_links rows used to need a title and a link. Now the title, the link
-- and the logo (20261006000019) may each be left empty. The website shows an
-- entry as its logo or else its title, so one with neither is not shown; one
-- without a link is shown but does not open anything.
--
-- A title or link that is given must still be well formed.
--
-- Safe to run twice.

alter table public.site_links
  alter column title drop not null,
  alter column url drop not null;

alter table public.site_links drop constraint if exists site_links_title_check;
alter table public.site_links drop constraint if exists site_links_url_check;
alter table public.site_links
  add constraint site_links_title_check
    check (title is null or char_length(title) between 1 and 120),
  add constraint site_links_url_check
    check (url is null or url ~* '^https?://');
