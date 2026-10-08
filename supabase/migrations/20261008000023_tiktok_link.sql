-- The clinic's TikTok profile, saved as if entered under Social media in the
-- dashboard. Added to the other saved links (Facebook, X, LinkedIn, YouTube
-- are kept); it can be changed later in the dashboard. The website already
-- shows it without this, as its default.
--
-- Safe to run twice.

insert into public.site_settings (key, value, updated_at)
values ('social',
        '{"tiktok": "https://www.tiktok.com/@dermasoulmedical"}'::jsonb,
        now())
on conflict (key) do update
  set value = public.site_settings.value || excluded.value,
      updated_at = excluded.updated_at;
