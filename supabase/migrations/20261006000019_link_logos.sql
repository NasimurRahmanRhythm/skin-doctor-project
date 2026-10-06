-- Logos for "As seen in" and "Certifications & Societies".
--
-- Each site_links row may carry a logo, stored in the public site-media
-- bucket like every other website picture. On the landing page a row with a
-- logo scrolls past as the logo (its title becomes the logo's alt text); one
-- without keeps scrolling as its title. Optional.
--
-- Safe to run twice.

alter table public.site_links
  add column if not exists logo_path text;
