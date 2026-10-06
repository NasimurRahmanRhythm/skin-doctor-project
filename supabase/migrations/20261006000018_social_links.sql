-- The clinic's social media profiles, shown as icons in the website footer.
--
-- Instagram keeps its own site_settings key ('instagram': the Instagram
-- section and the floating button read it). Facebook, X, LinkedIn and YouTube
-- go together under a new key, 'social':
--
--   { "facebook": "https://…", "x": "https://…", "linkedin": "https://…",
--     "youtube": "https://…" }
--
-- each link optional. Visitors may only read the keys the public policy
-- lists, so 'social' is added to it.
--
-- Safe to run twice.

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated
  using (key in ('instagram', 'google_reviews', 'social'));
